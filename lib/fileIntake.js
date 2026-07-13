"use client";

/* Turns a File the user dropped, pasted or picked into the wire shape in lib/attachments.js.
   Everything expensive happens HERE, in the browser, on the user's machine:

     images → downscaled and re-encoded, so a 12 MP phone photo becomes ~250 KB instead of a
              4 MB upload that the spend guard would have to price as if it were a whole chat
     PDFs   → flattened to their text layer (lib/pdfText.js), so no binary parser ever runs
              server-side on a file a stranger uploaded

   A file that cannot be read is NOT silently dropped: every rejection comes back with a reason
   key the caller renders as a toast. Quietly ignoring an attachment the user watched themselves
   attach is the one outcome worse than refusing it. */

import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_TEXT_CHARS,
  isImageMime,
} from "./attachments";
import { extractPdfText } from "./pdfText";

/* Long edge, in pixels, of what we actually send. Small enough to keep one image well under a
   cent of prompt, large enough that the text in a screenshot of a chart is still legible —
   which is the whole reason someone attaches a screenshot. */
const IMAGE_MAX_EDGE = 1536;
const IMAGE_QUALITY = 0.9;
const THUMB_MAX_EDGE = 200;
const THUMB_QUALITY = 0.6;

const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024; // pre-downscale; a raw DSLR shot fits
const MAX_TEXT_FILE_BYTES = 3 * 1024 * 1024;

const TEXT_MIME = /^text\/|^application\/(json|xml|javascript|x-yaml|x-sh|sql|toml)$/;
const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|log|ya?ml|xml|html?|css|js|jsx|mjs|cjs|ts|tsx|py|sol|rs|go|rb|java|c|h|cpp|sh|bash|zsh|sql|toml|ini|cfg|conf|env|srt|vtt)$/i;

let seq = 0;
const nextId = () => `att${Date.now().toString(36)}${(seq++).toString(36)}`;

function isTextFile(file) {
  return TEXT_MIME.test(file.type || "") || TEXT_EXT.test(file.name || "");
}

function isPdf(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
}

function loadBitmap(file) {
  /* createImageBitmap is the fast path and the only one that decodes off the main thread, but
     Safari has historically refused some encodings it happily renders in an <img>. Falling back
     to an object URL keeps those files working. */
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).catch(() => loadViaObjectUrl(file));
  }
  return loadViaObjectUrl(file);
}

function loadViaObjectUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function drawScaled(bitmap, maxEdge, mime, quality) {
  const w = bitmap.width || 1;
  const h = bitmap.height || 1;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));

  const ctx = canvas.getContext("2d");
  /* JPEG has no alpha, and an un-backed transparent PNG encodes to black-on-black — which is
     an unreadable image the model will confidently describe as blank. Lay down white first. */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL(mime, quality);
}

async function readImage(file) {
  if (file.size > MAX_IMAGE_FILE_BYTES) return { error: "tooBig" };

  let bitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    return { error: "unreadable" };
  }

  try {
    const dataUrl = drawScaled(bitmap, IMAGE_MAX_EDGE, "image/jpeg", IMAGE_QUALITY);
    const thumb = drawScaled(bitmap, THUMB_MAX_EDGE, "image/jpeg", THUMB_QUALITY);
    return {
      attachment: {
        id: nextId(),
        kind: "image",
        name: file.name || "image.jpg",
        mime: "image/jpeg", // whatever came in, this is what we re-encoded to
        size: file.size,
        dataUrl,
        thumb,
      },
    };
  } catch {
    return { error: "unreadable" };
  } finally {
    bitmap.close?.();
  }
}

async function readText(file) {
  if (file.size > MAX_TEXT_FILE_BYTES) return { error: "tooBig" };

  let raw;
  try {
    raw = await file.text();
  } catch {
    return { error: "unreadable" };
  }
  if (!raw.trim()) return { error: "emptyFile" };

  const truncated = raw.length > MAX_ATTACHMENT_TEXT_CHARS;
  const text = truncated ? `${raw.slice(0, MAX_ATTACHMENT_TEXT_CHARS)}\n…[truncated]` : raw;

  return {
    attachment: {
      id: nextId(),
      kind: "text",
      name: file.name || "file.txt",
      mime: file.type || "text/plain",
      size: file.size,
      text,
      chars: raw.length,
      truncated,
    },
  };
}

async function readPdf(file) {
  let result;
  try {
    result = await extractPdfText(file, { maxChars: MAX_ATTACHMENT_TEXT_CHARS });
  } catch {
    return { error: "pdfUnreadable" };
  }

  if (!result.ok) {
    return {
      error:
        result.reason === "encrypted"
          ? "pdfEncrypted"
          : result.reason === "too-big"
            ? "tooBig"
            : "pdfUnreadable", // no text layer — a scan, or a font we cannot decode
    };
  }

  return {
    attachment: {
      id: nextId(),
      kind: "text",
      name: file.name || "document.pdf",
      mime: "application/pdf",
      size: file.size,
      text: result.text,
      chars: result.text.length,
      truncated: result.text.endsWith("[truncated]"),
    },
  };
}

/**
 * @returns {Promise<{ attachments: object[], errors: Array<{ name: string, reason: string }> }>}
 *   `reason` is an i18n suffix — see the "attach.err.*" keys in lib/locales/en.js.
 */
export async function intakeFiles(files, { existingCount = 0 } = {}) {
  const list = Array.from(files || []);
  const attachments = [];
  const errors = [];

  let room = MAX_ATTACHMENTS - existingCount;

  for (const file of list) {
    if (room <= 0) {
      errors.push({ name: file.name, reason: "tooMany" });
      continue;
    }

    let result;
    if (isImageMime(file.type) || /^image\//.test(file.type || "")) result = await readImage(file);
    else if (isPdf(file)) result = await readPdf(file);
    else if (isTextFile(file)) result = await readText(file);
    else result = { error: "unsupported" };

    if (result.error) {
      errors.push({ name: file.name, reason: result.error });
      continue;
    }

    attachments.push(result.attachment);
    room--;
  }

  return { attachments, errors };
}

/* What goes over the wire — the full-size image and the extracted text, nothing else. The id,
   the thumbnail and the original byte size are local UI state and have no business being
   billed as prompt. */
export function toWireAttachments(attachments = []) {
  return attachments.map((a) =>
    a.kind === "image"
      ? { kind: "image", name: a.name, mime: a.mime, dataUrl: a.dataUrl }
      : { kind: "text", name: a.name, mime: a.mime, text: a.text }
  );
}

/* What gets pinned to the message in chat history — and therefore into localStorage. The
   full-size data URL is deliberately dropped: four of them per message would blow the ~5 MB
   quota within a handful of chats and take every saved conversation down with it. The 200px
   thumbnail is what the bubble renders. */
export function toStoredAttachments(attachments = []) {
  return attachments.map((a) => ({
    id: a.id,
    kind: a.kind,
    name: a.name,
    mime: a.mime,
    size: a.size,
    ...(a.kind === "image" ? { thumb: a.thumb } : { chars: a.chars, truncated: a.truncated }),
  }));
}
