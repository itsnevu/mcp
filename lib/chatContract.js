import { isValidReply } from "./text";
import { sanitizeAttachments } from "./attachments";

export const APP_NAME = "Bugglo";
export const CHAIN_NAME = "Robinhood Chain";
export const SERVICE_NAME = "bugglo-backend";
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_HISTORY_ITEMS = 12;
export const MODES = ["Auto", "Fast", "Deep"];

/* Stands in for the prose the user did not type when they attached a file and hit send. */
export const DEFAULT_ATTACHMENT_PROMPT =
  "Read the attached file(s) and tell me what matters in them.";

export function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : "Auto";
}

export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => {
      return (
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.text === "string" &&
        item.text.trim()
      );
    })
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,
      text: item.text.slice(0, MAX_MESSAGE_CHARS),
    }));
}

export function parseChatRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "JSON object body is required" };
  }

  const attachments = sanitizeAttachments(body.attachments);

  const message = typeof body.message === "string" ? body.message.trim() : "";
  /* An attachment IS the question often enough — dropping four files in with no prose and
     expecting a read is the whole point — so a message is only mandatory when nothing else
     came with it. The model still needs an instruction, so supply the obvious one. */
  const prompt = message || (attachments.length ? DEFAULT_ATTACHMENT_PROMPT : "");
  if (!prompt) {
    return { ok: false, status: 400, error: "message (string) is required" };
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      status: 413,
      error: `message must be ${MAX_MESSAGE_CHARS} characters or fewer`,
    };
  }

  return {
    ok: true,
    value: {
      message: prompt,
      mode: normalizeMode(body.mode),
      history: sanitizeHistory(body.history),
      attachments,
      incognito: body.incognito === true,
    },
  };
}

export function isValidChatResponse(data) {
  return (
    data &&
    typeof data === "object" &&
    isValidReply(data.reply) &&
    data.source === "live"
  );
}
