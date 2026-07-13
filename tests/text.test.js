import { describe, expect, it } from "vitest";
import { isValidReply, renderRich, replyToText } from "@/lib/text";

describe("text helpers", () => {
  it("escapes html before applying tiny markdown", () => {
    const html = renderRich('**safe** <img src=x onerror=alert(1)> `code` </style><script>x</script>');

    expect(html).toContain("<strong>safe</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;/style&gt;&lt;script&gt;x&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });

  it("rejects malformed rich replies", () => {
    expect(isValidReply({ kind: "sentiment", ticker: "$HOOD", bullish: "missing", bearish: "missing" })).toBe(false);
    expect(isValidReply({ kind: "trending", items: [{ mentions: "missing" }] })).toBe(false);
    expect(isValidReply({ kind: "wallet", address: "0xabc", stats: [] })).toBe(true);
  });

  it("projects widgets into stable plain text", () => {
    const text = replyToText({
      kind: "rugcheck",
      address: "0xabc",
      verdict: "LOW RISK",
      checks: [{ label: "Ownership", note: "renounced" }],
      summary: "DYOR",
    });

    expect(text).toContain("Rug check 0xabc: LOW RISK");
    expect(text).toContain("- Ownership: renounced");
    expect(text).toContain("DYOR");
  });
});
