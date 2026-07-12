import { demoAgent } from "@/lib/demoAgent";

/**
 * POST /api/chat  { message, mode, history[] }
 *   → { reply: string | { kind: "text"|"rugcheck"|"trending"|"sentiment"|"wallet", ... } }
 *
 * ─────────────────────────────────────────────────────────────────────
 * GOING LIVE (Claude API + robinx-mcp)
 * ─────────────────────────────────────────────────────────────────────
 *   npm install @anthropic-ai/sdk @modelcontextprotocol/sdk robinx-mcp
 *   # .env.local → ANTHROPIC_API_KEY=sk-ant-...
 *
 * Then replace the demoAgent call below with an agentic loop:
 *
 *   import Anthropic from "@anthropic-ai/sdk";
 *   import { Client } from "@modelcontextprotocol/sdk/client/index.js";
 *   import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
 *
 *   // 1. connect to the robinx-mcp server over stdio (cache this globally)
 *   const mcp = new Client({ name: "ranger-backend", version: "1.0.0" });
 *   await mcp.connect(new StdioClientTransport({ command: "npx", args: ["-y", "robinx-mcp"] }));
 *   const { tools } = await mcp.listTools();
 *
 *   // 2. hand those tools to Claude and run until it produces a final answer
 *   const anthropic = new Anthropic();
 *   const runner = anthropic.beta.messages.toolRunner({
 *     model: "claude-sonnet-5",
 *     max_tokens: 2048,
 *     system:
 *       "You are Ranger, an agentic scout for Robinhood Chain. " +
 *       "Use the tools to answer with real on-chain data.",
 *     messages: [
 *       ...history.map((h) => ({ role: h.role, content: h.text })),
 *       { role: "user", content: message },
 *     ],
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
 *   const text = final.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
 *   return Response.json({ reply: { kind: "text", text } });
 * ─────────────────────────────────────────────────────────────────────
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { message } = body || {};
  if (!message || typeof message !== "string") {
    return Response.json({ error: "message (string) is required" }, { status: 400 });
  }

  // Small delay so the typing indicator is visible.
  await new Promise((r) => setTimeout(r, 400));

  return Response.json({ reply: demoAgent(message) });
}
