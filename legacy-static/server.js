#!/usr/bin/env node
/**
 * Ranger backend — zero-dependency Node server.
 *
 *   node server.js            → http://localhost:3040
 *   PORT=8080 node server.js  → custom port
 *
 * Serves the static UI (index.html) and a demo /api/chat endpoint.
 * The frontend works without this server too (built-in demo agent);
 * running it flips the status pill from "Demo mode" to "Live".
 *
 * ─────────────────────────────────────────────────────────────────────
 * GOING LIVE (Claude API + robinx-mcp)
 * ─────────────────────────────────────────────────────────────────────
 *   npm init -y
 *   npm install @anthropic-ai/sdk @modelcontextprotocol/sdk robinx-mcp
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *
 * Then replace buildReply() below with something like:
 *
 *   const Anthropic = require("@anthropic-ai/sdk");
 *   const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
 *   const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
 *
 *   // 1. connect to the robinx-mcp server over stdio
 *   const mcp = new Client({ name: "ranger-backend", version: "1.0.0" });
 *   await mcp.connect(new StdioClientTransport({ command: "npx", args: ["-y", "robinx-mcp"] }));
 *   const { tools } = await mcp.listTools();
 *
 *   // 2. hand those tools to Claude and run the agentic loop
 *   const anthropic = new Anthropic();
 *   const runner = anthropic.beta.messages.toolRunner({
 *     model: "claude-sonnet-5",
 *     max_tokens: 2048,
 *     system: "You are Ranger, an agentic scout for Robinhood Chain. " +
 *             "Use the tools to answer with real on-chain data.",
 *     messages: [...history, { role: "user", content: message }],
 *     tools: tools.map((t) => ({
 *       name: t.name,
 *       description: t.description,
 *       input_schema: t.inputSchema,
 *       run: async (input) => {
 *         const out = await mcp.callTool({ name: t.name, arguments: input });
 *         return JSON.stringify(out.content);
 *       },
 *     })),
 *   });
 *   const final = await runner.runUntilDone();
 *   return { kind: "text", text: final.content.filter(b => b.type === "text").map(b => b.text).join("\n") };
 *
 * Reply shapes the UI can render (see index.html renderAgentReply):
 *   { kind: "text",      text }
 *   { kind: "rugcheck",  address, riskScore, verdict, checks[], summary, intro?, demo? }
 *   { kind: "trending",  items[{ticker, mentions, change, senti, spark[]}], intro?, demo? }
 *   { kind: "sentiment", ticker, bullish, bearish, neutral, posts, note, intro?, demo? }
 *   { kind: "wallet",    address, stats[{label,value}], flags[], intro?, demo? }
 * ─────────────────────────────────────────────────────────────────────
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3040;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, obj) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

/* ── demo reply builder (server-side twin of the frontend demo agent) ── */
function buildReply(message) {
  const t = String(message || "").toLowerCase();
  const addr = String(message || "").match(/0x[a-fA-F0-9]{6,}/)?.[0];
  const ticker = String(message || "").match(/\$[A-Za-z][A-Za-z0-9]{1,9}/)?.[0];
  const short = (a) => (a && a.length > 20 ? a.slice(0, 10) + "…" + a.slice(-6) : a);

  if (t.includes("rug check") || t.includes("rugcheck")) {
    if (!addr) return { kind: "text", text: "Paste the full contract address (`0x…`, 42 characters) and I'll run a rug check." };
    return {
      kind: "rugcheck", demo: true,
      address: short(addr), riskScore: 18, verdict: "LOW RISK",
      intro: "Scan complete (server demo data). Here's the report:",
      checks: [
        { ok: true, label: "Ownership", note: "renounced at deploy" },
        { ok: true, label: "Liquidity", note: "92% locked for 180 days" },
        { ok: true, label: "Honeypot test", note: "sell simulation passed" },
        { ok: false, label: "Holder concentration", note: "top 10 wallets hold 14.2% — worth watching" },
        { ok: true, label: "Deployer history", note: "3 prior tokens, no rug patterns" },
      ],
      summary: "Heuristic score only — wire robinx-mcp here for real deployer/liquidity analysis.",
    };
  }

  if (t.includes("trending")) {
    return {
      kind: "trending", demo: true,
      intro: "Server demo data — wire the Claude API + robinx-mcp for live rankings:",
      items: [
        { ticker: "$HOOD", mentions: 4812, change: 38, senti: "74% bullish", spark: [3, 4, 4, 6, 7, 9, 12, 14] },
        { ticker: "$SNOW", mentions: 2105, change: 21, senti: "61% bullish", spark: [5, 5, 6, 5, 7, 8, 8, 9] },
        { ticker: "$RBHX", mentions: 1644, change: 90, senti: "mixed — high FUD", spark: [1, 1, 2, 2, 3, 5, 9, 11] },
        { ticker: "$GLD", mentions: 903, change: -12, senti: "55% bullish", spark: [8, 7, 7, 6, 6, 5, 5, 4] },
      ],
    };
  }

  if (t.includes("sentiment") || t.includes("fud") || ticker) {
    return {
      kind: "sentiment", demo: true,
      ticker: ticker || "$HOOD",
      bullish: 71, bearish: 18, neutral: 11, posts: 3204,
      intro: `Server demo data — 𝕏 pulse for ${ticker || "$HOOD"}:`,
      note: "Replace buildReply() in server.js with the Claude tool-runner loop for live sentiment.",
    };
  }

  if (t.includes("wallet") || t.includes("analyze")) {
    if (!addr) return { kind: "text", text: "Paste a full wallet address (`0x…`) and I'll analyze it." };
    return {
      kind: "wallet", demo: true,
      address: short(addr),
      intro: "Server demo data — wallet scan:",
      stats: [
        { label: "Age", value: "142 days" },
        { label: "Transactions", value: "1,203" },
        { label: "PnL (30d)", value: "+$12,480 est." },
        { label: "Avg hold", value: "3.2 days" },
      ],
      flags: ["No mixer interactions detected", "Early entries on new DEX listings"],
    };
  }

  return {
    kind: "text",
    text: "**Ranger backend is connected** ✅ (demo replies)\n\nThis answer came from `server.js`. Edit `buildReply()` there to plug in the Claude API + `robinx-mcp` for live Robinhood Chain data.\n\nTry `/trending`, `/rugcheck 0x…`, `/sentiment $HOOD`, or `/wallet 0x…`",
  };
}

/* ── HTTP server ── */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "ranger-backend", mode: "demo" });
  }

  if (url.pathname === "/api/chat" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      try {
        const { message } = JSON.parse(body || "{}");
        if (!message || typeof message !== "string") {
          return sendJson(res, 400, { error: "message (string) is required" });
        }
        // Simulate a little agent latency so the typing indicator shows.
        setTimeout(() => sendJson(res, 200, { reply: buildReply(message) }), 400);
      } catch {
        sendJson(res, 400, { error: "invalid JSON body" });
      }
    });
    return;
  }

  // static files (with path-traversal guard)
  let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (url.pathname === "/" || url.pathname === "") filePath = path.join(ROOT, "index.html");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    cors(res);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🏇 Ranger backend running → http://localhost:${PORT}\n`);
  console.log(`  UI:      http://localhost:${PORT}/`);
  console.log(`  Health:  http://localhost:${PORT}/api/health`);
  console.log(`  Chat:    POST http://localhost:${PORT}/api/chat  { "message": "..." }\n`);
});
