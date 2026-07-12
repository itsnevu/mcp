import { shortAddr } from "./text";

/**
 * DEMO AGENT — deterministic placeholder data, clearly tagged demo:true.
 * Used by the /api/chat route AND as the client-side fallback when no
 * backend responds. Replace the /api/chat route with a real Claude API +
 * robinx-mcp agentic loop for live Robinhood Chain answers (see the
 * comments in app/api/chat/route.js).
 *
 * Reply shapes the UI can render (components/Widgets.jsx):
 *   { kind: "text",      text }
 *   { kind: "rugcheck",  address, riskScore, verdict, checks[], summary, intro?, demo? }
 *   { kind: "trending",  items[{ticker, mentions, change, senti, spark[]}], intro?, demo? }
 *   { kind: "sentiment", ticker, bullish, bearish, neutral, posts, note, intro?, demo? }
 *   { kind: "wallet",    address, stats[{label,value}], flags[], intro?, demo? }
 */
export function demoAgent(text) {
  const t = String(text || "").toLowerCase();
  const addr = String(text || "").match(/0x[a-fA-F0-9]{6,}/)?.[0];
  const ticker = String(text || "").match(/\$[A-Za-z][A-Za-z0-9]{1,9}/)?.[0];

  if (t.includes("rug check") || t.includes("rugcheck") || t.includes("top holders")) {
    if (!addr) {
      return {
        kind: "text",
        text: "Paste the full contract address (42 characters, starting with `0x`) and I'll run a rug check — deployer history, liquidity locks, holder concentration, and a honeypot sell simulation.",
      };
    }
    return {
      kind: "rugcheck",
      demo: true,
      address: shortAddr(addr),
      riskScore: 18,
      verdict: "LOW RISK",
      intro: "Scan complete. Here's the report:",
      checks: [
        { ok: true, label: "Ownership", note: "renounced at deploy" },
        { ok: true, label: "Liquidity", note: "92% locked for 180 days" },
        { ok: true, label: "Honeypot test", note: "sell simulation passed" },
        { ok: false, label: "Holder concentration", note: "top 10 wallets hold 14.2% — worth watching" },
        { ok: true, label: "Deployer history", note: "3 prior tokens, no rug patterns" },
      ],
      summary: "Heuristic score only — always DYOR. Not financial advice.",
    };
  }

  if (t.includes("trending") && (t.includes("ticker") || t.includes("token"))) {
    return {
      kind: "trending",
      demo: true,
      intro: "Here's what's heating up in the last 24 hours:",
      items: [
        { ticker: "$HOOD", mentions: 4812, change: 38, senti: "74% bullish", spark: [3, 4, 4, 6, 7, 9, 12, 14] },
        { ticker: "$SNOW", mentions: 2105, change: 21, senti: "61% bullish", spark: [5, 5, 6, 5, 7, 8, 8, 9] },
        { ticker: "$RBHX", mentions: 1644, change: 90, senti: "mixed — high FUD", spark: [1, 1, 2, 2, 3, 5, 9, 11] },
        { ticker: "$GLD", mentions: 903, change: -12, senti: "55% bullish", spark: [8, 7, 7, 6, 6, 5, 5, 4] },
      ],
    };
  }

  if (t.includes("moving") || (t.includes("trending") && t.includes("robinhood"))) {
    return {
      kind: "text",
      text: '**What\'s moving on Robinhood Chain** (demo data)\n\n• **DEX volume:** $41.2M in the last 24h (+17%)\n• **Hottest pair:** `HOOD/USDG` — $8.9M volume\n• **New tokens:** 63 deployed in 24h, 4 passed rug screening\n• **𝕏 chatter:** "Robinhood Chain" mentions up 44% today\n\nAsk me to rug-check any contract, or try `/trending` for tickers.',
    };
  }

  if (t.includes("fud")) {
    return {
      kind: "sentiment",
      demo: true,
      ticker: ticker || "$HOOD",
      bullish: 58,
      bearish: 27,
      neutral: 15,
      posts: 1842,
      intro: "FUD scan finished — here's the breakdown:",
      note: "Coordinated-FUD probability: 12% (low). 4% of posters look bot-like. The bearish chatter reads as organic profit-taking, not an attack.",
    };
  }

  if (t.includes("sentiment") || ticker) {
    return {
      kind: "sentiment",
      demo: true,
      ticker: ticker || "$HOOD",
      bullish: 71,
      bearish: 18,
      neutral: 11,
      posts: 3204,
      intro: `Here's the 𝕏 pulse for ${ticker || "$HOOD"}:`,
      note: "3 accounts with >100k followers posted today. No coordinated FUD detected. Want the top posts or an influencer breakdown?",
    };
  }

  if (t.includes("wallet") || t.includes("analyze")) {
    if (!addr) {
      return {
        kind: "text",
        text: "Paste a full wallet address (`0x…`, 42 characters) and I'll analyze it — age, PnL, trading style, and risk flags.",
      };
    }
    return {
      kind: "wallet",
      demo: true,
      address: shortAddr(addr),
      intro: "Wallet scan complete:",
      stats: [
        { label: "Age", value: "142 days" },
        { label: "Transactions", value: "1,203" },
        { label: "PnL (30d)", value: "+$12,480 est." },
        { label: "Avg hold", value: "3.2 days" },
      ],
      flags: ["No mixer interactions detected", "Early entries on new DEX listings"],
    };
  }

  if (t.includes("dex") || t.includes("latest")) {
    return {
      kind: "trending",
      demo: true,
      intro: "Newest DEX tokens on Robinhood Chain (last 24h):",
      items: [
        { ticker: "$ARROW", mentions: 611, change: 46, senti: "fresh launch", spark: [0, 1, 1, 2, 4, 5, 8, 12] },
        { ticker: "$FEATH", mentions: 302, change: -6, senti: "cooling off", spark: [6, 7, 8, 7, 6, 5, 5, 4] },
        { ticker: "$WOOD", mentions: 1250, change: 13, senti: "68% bullish", spark: [2, 3, 3, 4, 4, 5, 6, 6] },
      ],
    };
  }

  if (t.includes("account")) {
    return {
      kind: "text",
      text: "**Top 𝕏 accounts for $HOOD** (demo data)\n\n1. **@chainwatcher** — 214k followers, 9 posts this week, historically early\n2. **@hoodalpha** — 156k followers, bullish thread today (2.1k likes)\n3. **@rbhx_intel** — 98k followers, neutral analysis, high accuracy score\n\nConnect the backend for live account rankings.",
    };
  }

  return {
    kind: "text",
    text: "I'm **HoodScope**, your intelligence layer for **Robinhood Chain** — 𝕏 sentiment, rug checks, wallet analysis, and market moves.\n\nAnswers currently use **demo data** unless the live Claude + RobinX MCP backend is configured.\n\nTry `/trending`, `/rugcheck 0x…`, `/sentiment $HOOD`, or `/wallet 0x…`",
  };
}
