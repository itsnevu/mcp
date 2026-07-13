/* Best-effort PDF text extraction, in the browser, with no dependency.
 *
 * Why not pdf.js: it is ~1 MB of worker for a feature whose job is to turn a whitepaper or a
 * token audit into a few thousand characters of prompt. Everything needed for THAT is already
 * in the platform — DecompressionStream inflates a FlateDecode stream, and a content stream's
 * text is just the operands of its Tj and TJ operators.
 *
 * What this does NOT do, and must never pretend to: scanned pages (no text layer at all),
 * DCT/LZW/ASCII85-filtered streams, and fonts with a custom CID encoding all come back as
 * nothing or as mojibake. That is why extractPdfText returns a confidence signal instead of a
 * bare string — the caller shows an honest "couldn't read this PDF" rather than posting
 * garbage to the model and billing the user for it.
 */

const MAX_PDF_BYTES = 20 * 1024 * 1024;

/* Latin-1 maps bytes 1:1 onto code points, so the PDF's structure (which is ASCII) can be
   scanned as a string while binary stream payloads survive the round trip untouched. */
function toLatin1(bytes) {
  let out = "";
  const CHUNK = 0x8000; // String.fromCharCode blows the stack on a whole file at once
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}

function fromLatin1(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

/* PDF FlateDecode is zlib-wrapped ("deflate"), but producers in the wild ship raw deflate
   often enough that giving up on the first failure loses real documents. */
async function inflate(bytes) {
  for (const format of ["deflate", "deflate-raw"]) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
      const buf = await new Response(stream).arrayBuffer();
      if (buf.byteLength) return new Uint8Array(buf);
    } catch {
      /* wrong wrapper — try the other one */
    }
  }
  return null;
}

const OCTAL = /[0-7]/;

/* Operands of the text-showing operators: `(literal) Tj`, `[(kerned) -300 (pairs)] TJ`, and
   the two quote operators. A PDF has no newlines — only "move the text cursor" — so the
   positioning operators (Td, TD, T-star) and ET are what a line break actually looks like. */
function textFromContentStream(content) {
  let out = "";
  let i = 0;

  const readLiteral = () => {
    // the caller has already consumed the opening "("
    let depth = 1;
    let s = "";
    while (i < content.length) {
      const ch = content[i++];
      if (ch === "\\") {
        const esc = content[i++];
        if (esc === "n") s += "\n";
        else if (esc === "r") s += "\n";
        else if (esc === "t") s += "\t";
        else if (OCTAL.test(esc)) {
          let oct = esc;
          while (oct.length < 3 && OCTAL.test(content[i] || "")) oct += content[i++];
          s += String.fromCharCode(parseInt(oct, 8));
        } else s += esc;
        continue;
      }
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) break;
      }
      s += ch;
    }
    return s;
  };

  while (i < content.length) {
    const ch = content[i];

    if (ch === "(") {
      i++;
      out += readLiteral();
      continue;
    }

    // hex string: <48656C6C6F>. A lone "<" only — "<<" opens a dictionary.
    if (ch === "<" && content[i + 1] !== "<") {
      const end = content.indexOf(">", i);
      if (end === -1) break;
      const hex = content.slice(i + 1, end).replace(/[^0-9a-fA-F]/g, "");
      for (let h = 0; h + 1 < hex.length; h += 2) {
        const code = parseInt(hex.slice(h, h + 2), 16);
        if (code >= 32) out += String.fromCharCode(code);
      }
      i = end + 1;
      continue;
    }

    if (ch === "T" && (content[i + 1] === "d" || content[i + 1] === "D" || content[i + 1] === "*")) {
      out += "\n";
      i += 2;
      continue;
    }
    if (ch === "E" && content[i + 1] === "T") {
      out += "\n";
      i += 2;
      continue;
    }
    /* The literals inside a TJ array have already been emitted by the "(" branch above, so
       its close bracket only needs to contribute the word gap. */
    if (ch === "]" || ch === "'" || ch === '"') {
      out += " ";
      i++;
      continue;
    }

    i++;
  }

  return out;
}

/* Mojibake detection. A real text layer is mostly letters, digits and spaces; a CID font
   decoded without its CMap is mostly control bytes and accented noise. */
function looksLikeText(s) {
  const trimmed = s.replace(/\s+/g, " ").trim();
  if (trimmed.length < 40) return false;
  const readable = (trimmed.match(/[\p{L}\p{N}\s.,;:!?'"()$%+\-/]/gu) || []).length;
  return readable / trimmed.length > 0.75;
}

function tidy(s) {
  return s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * @returns {Promise<{ ok: true, text: string } | { ok: false, reason: "empty"|"encrypted"|"too-big"|"unsupported" }>}
 */
export async function extractPdfText(file, { maxChars = 6000 } = {}) {
  if (file.size > MAX_PDF_BYTES) return { ok: false, reason: "too-big" };
  if (typeof DecompressionStream === "undefined") return { ok: false, reason: "unsupported" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const raw = toLatin1(bytes);

  /* An encrypted PDF's streams inflate to ciphertext, which would sail straight past
     looksLikeText as "empty" — say what it actually is instead. */
  if (/\/Encrypt[\s/]/.test(raw)) return { ok: false, reason: "encrypted" };

  let text = "";
  let at = 0;

  while (text.length < maxChars * 3) {
    const kw = raw.indexOf("stream", at);
    if (kw === -1) break;
    at = kw + 6;
    if (raw.slice(kw - 3, kw) === "end") continue; // the "stream" inside "endstream"

    let start = at;
    if (raw[start] === "\r") start++;
    if (raw[start] === "\n") start++;
    // The dict that owns this stream says whether it is text, and how it is packed.
    const objAt = raw.lastIndexOf("obj", kw);
    const dict = objAt === -1 ? "" : raw.slice(objAt, kw);
    if (/\/Subtype\s*\/Image|\/XObject|\/Font(?:File)?\b/.test(dict)) continue;

    const declaredLength = Number(dict.match(/\/Length\s+(\d+)/)?.[1]);
    const end = Number.isFinite(declaredLength) && declaredLength >= 0
      ? start + declaredLength
      : raw.indexOf("endstream", start);
    if (end === -1 || end > raw.length) break;
    at = raw.indexOf("endstream", end);
    at = at === -1 ? end : at + 9; // past this stream either way, so a skipped one cannot be rescanned as data

    const payload = raw.slice(start, end);
    let content = null;

    if (/\/FlateDecode/.test(dict)) {
      const inflated = await inflate(fromLatin1(payload));
      if (inflated) content = toLatin1(inflated);
    } else if (!/\/Filter/.test(dict)) {
      content = payload; // stored uncompressed
    }
    // Any other filter (DCT, LZW, ASCII85, JBIG2) is left alone — see the header.

    if (content && /(Tj|TJ)[\s\]]/.test(content)) {
      text += textFromContentStream(content) + "\n";
    }
  }

  const clean = tidy(text);
  if (!looksLikeText(clean)) return { ok: false, reason: "empty" };

  return {
    ok: true,
    text: clean.length > maxChars ? `${clean.slice(0, maxChars)}\n…[truncated]` : clean,
  };
}
