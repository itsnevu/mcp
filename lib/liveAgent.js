import Anthropic from "@anthropic-ai/sdk";
import { mcpTools } from "@anthropic-ai/sdk/helpers/beta/mcp";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { BUGGLO_SYSTEM_PROMPT } from "./systemPrompt.js";
import fs from "fs";
import path from "path";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_ALLOWED_TOOLS = [
  "robinx_verdict",
  "robinx_deployer",
  "robinx_token",
  "robinx_feed",
  "robinx_leaderboard",
  "robinx_stats",
];

let anthropicClient;
let mcpState;

function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

function composeSignal(signal, ms) {
  const timerSignal = timeoutSignal(ms);
  if (!signal) return timerSignal;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([signal, timerSignal]);
  }
  return signal;
}

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function allowedToolNames() {
  const raw = process.env.ROBINX_ALLOWED_TOOLS;
  if (!raw) return new Set(DEFAULT_ALLOWED_TOOLS);
  return new Set(
    raw
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
  );
}

async function createMcpState() {
  const mcpClients = [];
  const runnableTools = [];
  
  // 1. Setup default RobinX MCP
  try {
    const robinxClient = new Client({ name: "hoodscope-backend", version: "1.0.0" });
    const env = {};
    for (const name of ["ROBINX_WALLET_KEY", "ROBINX_MAX_USD_PER_CALL", "ROBINX_URL", "HOODSCOPE_URL"]) {
      if (process.env[name]) env[name] = process.env[name];
    }
  
    await robinxClient.connect(
      new StdioClientTransport({
        command: "npx",
        args: ["-y", "robinx-mcp"],
        env: { ...process.env, ...env },
      })
    );
  
    const listed = await robinxClient.listTools();
    const allow = allowedToolNames();
    const tools = listed.tools.filter((tool) => allow.has(tool.name));
    if (tools.length) {
      runnableTools.push(...mcpTools(tools, robinxClient));
      mcpClients.push(robinxClient);
    }
  } catch (e) {
    console.error("Failed to connect default RobinX MCP", e);
  }

  // 2. Load additional MCP servers from mcp.json
  const mcpPath = path.join(process.cwd(), "mcp.json");
  let externalServers = {};
  if (fs.existsSync(mcpPath)) {
    try {
      externalServers = JSON.parse(fs.readFileSync(mcpPath, "utf8")).mcpServers;
    } catch (e) {
      console.error("Failed to parse mcp.json", e);
    }
  }

  for (const [name, config] of Object.entries(externalServers)) {
    try {
      const client = new Client({ name: "bugglo-" + name, version: "1.0.0" });
      if (config.command) {
        await client.connect(new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: process.env
        }));
      } else if (config.url) {
        await client.connect(new SSEClientTransport(new URL(config.url)));
      } else {
        continue;
      }
      
      const listed = await client.listTools();
      if (listed.tools && listed.tools.length) {
        runnableTools.push(...mcpTools(listed.tools, client));
        mcpClients.push(client);
        console.log(`Loaded MCP server: ${name} with ${listed.tools.length} tools`);
      }
    } catch(e) {
      console.error("Failed to connect external MCP server", name, e.message);
    }
  }

  if (!runnableTools.length) {
    throw new Error("No MCP tools were successfully exposed by any server");
  }
  
  return { mcpClients, runnableTools };
}

async function getMcpState() {
  if (!mcpState) {
    mcpState = createMcpState().catch((error) => {
      mcpState = null;
      throw error;
    });
  }
  return mcpState;
}

function textFromMessage(message) {
  return (message.content || [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function maxTokensForMode(mode) {
  if (mode === "Fast") return 768;
  if (mode === "Deep") return 2048;
  return 1280;
}

export function liveBackendConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function liveBackendHealth() {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    mcp: Boolean(mcpState),
    paidToolsEnabled: Boolean(process.env.ROBINX_WALLET_KEY),
  };
}

export async function getLiveAgentReply({ message, mode, history, signal }) {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  const mcp = await getMcpState();
  const requestSignal = composeSignal(signal, Number(process.env.CHAT_TIMEOUT_MS || 25000));
  const runner = anthropic.beta.messages.toolRunner(
    {
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokensForMode(mode),
      max_iterations: mode === "Deep" ? 6 : 4,
      system: BUGGLO_SYSTEM_PROMPT,
      messages: [
        ...history.map((item) => ({ role: item.role, content: item.text })),
        { role: "user", content: message },
      ],
      tools: mcp.runnableTools,
    },
    { signal: requestSignal }
  );

  const final = await runner.runUntilDone();
  const text = textFromMessage(final);
  if (!text) {
    throw new Error("Live agent returned no text content");
  }
  return { kind: "text", text };
}
