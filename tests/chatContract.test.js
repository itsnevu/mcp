import { describe, expect, it } from "vitest";
import {
  DEFAULT_ATTACHMENT_PROMPT,
  MAX_HISTORY_ITEMS,
  MAX_MESSAGE_CHARS,
  isValidChatResponse,
  parseChatRequest,
  sanitizeHistory,
} from "@/lib/chatContract";

describe("chat contract", () => {
  it("normalizes a valid request", () => {
    const parsed = parseChatRequest({
      message: "  hello  ",
      mode: "Unknown",
      history: [
        { role: "system", text: "drop" },
        { role: "user", text: "keep" },
      ],
    });

    expect(parsed.ok).toBe(true);
    expect(parsed.value).toEqual({
      message: "hello",
      mode: "Auto",
      history: [{ role: "user", text: "keep" }],
      attachments: [],
      incognito: false,
    });
  });

  it("accepts a file with no prose, but still rejects an empty request", () => {
    const withFile = parseChatRequest({
      message: "",
      attachments: [{ kind: "text", name: "notes.csv", mime: "text/csv", text: "a,b\n1,2" }],
    });

    // "read this" is a complete request when a file came with it — the prompt is supplied for it.
    expect(withFile.ok).toBe(true);
    expect(withFile.value.message).toBe(DEFAULT_ATTACHMENT_PROMPT);
    expect(withFile.value.attachments).toHaveLength(1);
    expect(parseChatRequest({ message: "secret", incognito: true }).value.incognito).toBe(true);

    expect(parseChatRequest({ message: "", attachments: [] })).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects missing and oversized messages", () => {
    expect(parseChatRequest({ message: "" })).toMatchObject({ ok: false, status: 400 });
    expect(parseChatRequest({ message: "x".repeat(MAX_MESSAGE_CHARS + 1) })).toMatchObject({
      ok: false,
      status: 413,
    });
  });

  it("caps history length and item text size", () => {
    const history = Array.from({ length: MAX_HISTORY_ITEMS + 5 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      text: "x".repeat(MAX_MESSAGE_CHARS + 20),
    }));

    const sanitized = sanitizeHistory(history);
    expect(sanitized).toHaveLength(MAX_HISTORY_ITEMS);
    expect(sanitized[0].text).toHaveLength(MAX_MESSAGE_CHARS);
  });

  it("validates full API response envelope", () => {
    expect(isValidChatResponse({ reply: { kind: "text", text: "ok" }, source: "live" })).toBe(true);
    expect(isValidChatResponse({ reply: { kind: "text", text: "ok" }, source: "unknown" })).toBe(false);
  });
});
