import { isValidReply } from "./text";

export const APP_NAME = "Bugglo";
export const SERVICE_NAME = "bugglo-backend";
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_HISTORY_ITEMS = 12;
export const MODES = ["Auto", "Fast", "Deep"];

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

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
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
      message,
      mode: normalizeMode(body.mode),
      history: sanitizeHistory(body.history),
    },
  };
}

export function sourceFromReply(reply, fallback = "demo") {
  if (reply && typeof reply === "object" && reply.demo === true) return "demo";
  return fallback;
}

export function isValidChatResponse(data) {
  return (
    data &&
    typeof data === "object" &&
    isValidReply(data.reply) &&
    ["live", "demo"].includes(data.source)
  );
}
