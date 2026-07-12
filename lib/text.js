export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* tiny markdown: **bold**, `code` — input is escaped first */
export function renderRich(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

export function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function shortAddr(a) {
  return a && a.length > 20 ? a.slice(0, 10) + "…" + a.slice(-6) : a;
}

/* Guard against malformed backend replies — anything that fails this falls
   back to the demo agent instead of crashing the renderer. */
export function isValidReply(r) {
  if (typeof r === "string") return true;
  if (!r || typeof r !== "object") return false;
  switch (r.kind) {
    case "text":
      return typeof r.text === "string";
    case "rugcheck":
      return typeof r.address === "string" && typeof r.riskScore === "number" && Array.isArray(r.checks);
    case "trending":
      return Array.isArray(r.items) && r.items.every((it) => it && typeof it.ticker === "string");
    case "sentiment":
      return (
        typeof r.ticker === "string" &&
        [r.bullish, r.bearish, r.neutral, r.posts].every((n) => typeof n === "number")
      );
    case "wallet":
      return typeof r.address === "string" && Array.isArray(r.stats);
    default:
      return false;
  }
}

/* plain-text projection of a reply (for copy + chat history sent to backend) */
export function replyToText(reply) {
  if (typeof reply === "string") return reply;
  switch (reply.kind) {
    case "text":
      return reply.text;
    case "rugcheck":
      return (
        `Rug check ${reply.address}: ${reply.verdict} (risk ${reply.riskScore}/100)\n` +
        (reply.checks || []).map((c) => `- ${c.label}: ${c.note}`).join("\n") +
        (reply.summary ? "\n" + reply.summary : "")
      );
    case "trending":
      return (
        "Trending tickers:\n" +
        (reply.items || [])
          .map(
            (it, i) =>
              `${i + 1}. ${it.ticker} — ${Number(it.mentions).toLocaleString()} mentions (${it.change >= 0 ? "+" : ""}${it.change}%), ${it.senti}`
          )
          .join("\n")
      );
    case "sentiment":
      return `Sentiment for ${reply.ticker}: ${reply.bullish}% bullish / ${reply.bearish}% bearish / ${reply.neutral}% neutral (${Number(reply.posts).toLocaleString()} posts). ${reply.note || ""}`;
    case "wallet":
      return (
        `Wallet ${reply.address}:\n` +
        (reply.stats || []).map((s) => `- ${s.label}: ${s.value}`).join("\n") +
        (reply.flags?.length ? "\nFlags: " + reply.flags.join("; ") : "")
      );
    default:
      return JSON.stringify(reply);
  }
}
