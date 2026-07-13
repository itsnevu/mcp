import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { BUGGLO_SYSTEM_PROMPT } from "./systemPrompt.js";
import { buildUserContent } from "./attachments.js";
import { usageToUsd } from "./rateLimit.js";
import fs from "fs";
import path from "path";

/* The engine is reached over a plain OpenAI-compatible chat-completions endpoint, so the
   provider is entirely a deployment detail: key, base URL and model id all come from the
   environment and none of them are baked in here. There is deliberately NO default base
   URL — a missing ROBINX_ENGINE_URL disables live mode rather than silently defaulting to
   somebody's endpoint. Keep it that way: the moment a vendor is baked into this file,
   stops being portable and starts leaking who we bill. */
function engineConfig() {
  const apiKey = process.env.ROBINX_ENGINE_KEY;
  const baseURL = process.env.ROBINX_ENGINE_URL;
  const model = process.env.ROBINX_ENGINE_MODEL;
  if (!apiKey || !baseURL || !model) return null;
  return { apiKey, baseURL, model };
}

const DEFAULT_ALLOWED_TOOLS = [
  "robinx_verdict",
  "robinx_deployer",
  "robinx_token",
  "robinx_feed",
  "robinx_leaderboard",
  "robinx_stats",
];

/* A tool result is re-sent to the model on every subsequent iteration, so an unbounded one
   is billed again and again. Chain data is exactly the shape that blows up here: one holder
   dump can be tens of thousands of characters. Truncating is what keeps a Deep run's cost
   linear in iterations instead of quadratic in whatever the chain happened to return. */
const MAX_TOOL_RESULT_CHARS = Number(process.env.ENGINE_MAX_TOOL_CHARS) || 4000;
const MAX_TOOL_RESULT_CHARS_TOTAL = Number(process.env.ENGINE_MAX_TOOL_CHARS_TOTAL) || 24000;

/* Every call out to an MCP server is bounded, because an unbounded one is not just slow —
   it is a permanent outage. A hung connect or a hung tool call parks the request forever,
   the spend guard's in-flight slot is never released, and from then on every user is
   answered "server busy" until the process is restarted. One dead remote server must not be
   able to do that, so: connect in parallel, cap each connect, cap each tool call. */
const MCP_CONNECT_TIMEOUT_MS = Number(process.env.MCP_CONNECT_TIMEOUT_MS) || 8000;
const MCP_TOOL_TIMEOUT_MS = Number(process.env.MCP_TOOL_TIMEOUT_MS) || 15000;

export function withTimeout(promise, ms, label) {
  let timer;
  const bell = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    timer.unref?.();
  });
  return Promise.race([promise, bell]).finally(() => clearTimeout(timer));
}

// MCP servers run as child processes and their tool output is untrusted. Never hand them
// the whole process env (it holds ROBINX_ENGINE_KEY, AUTH_SECRET, ROBINX_WALLET_KEY) — pass
// only the vars a server explicitly declares, on top of the SDK's minimal safe default env.
function childEnv(names = [], literals = {}) {
  const env = { ...getDefaultEnvironment() };
  for (const name of names) {
    if (process.env[name]) env[name] = process.env[name];
  }
  return { ...env, ...literals };
}

// Bugglo is a read-only intelligence agent. Nothing it does should move funds or sign,
// so tools whose names imply state changes are dropped unless a server opts in via allowedTools.
const MUTATING_TOOL = /(^|[._-])(send|transfer|sign|approve|swap|buy|sell|trade|execute|deploy|withdraw|mint|burn|bridge|revoke|import|export)/i;

function filterExternalTools(name, tools, allowedTools) {
  if (Array.isArray(allowedTools)) {
    const allow = new Set(allowedTools);
    return tools.filter((tool) => allow.has(tool.name));
  }
  return tools.filter((tool) => {
    if (!MUTATING_TOOL.test(tool.name)) return true;
    console.warn(`MCP ${name}: dropped state-changing tool "${tool.name}" (add it to allowedTools in mcp.json to opt in)`);
    return false;
  });
}

let engineClient;
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

function getEngine() {
  const config = engineConfig();
  if (!config) return null;
  if (!engineClient) {
    engineClient = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      maxRetries: 1, // a retried request is a second bill; the route already degrades gracefully
    });
  }
  return { client: engineClient, model: config.model };
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

/* The wire format only accepts [A-Za-z0-9_-]{1,64} as a function name, but MCP servers are
   free to use dots, slashes and colons — and two servers may well both expose "get_token".
   So the name the model sees is a sanitised, de-duplicated alias, and this registry maps it
   back to the (client, real name) pair that can actually run it. */
function registerTool(registry, mcpName, client, schema) {
  const base = mcpName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "tool";
  let alias = base;
  let n = 2;
  while (registry.has(alias)) {
    const suffix = `_${n}`;
    alias = base.slice(0, 64 - suffix.length) + suffix;
    n += 1;
  }
  registry.set(alias, { client, mcpName });
  return {
    type: "function",
    function: {
      name: alias,
      description: schema.description || `MCP tool ${mcpName}`,
      parameters: schema.inputSchema || { type: "object", properties: {} },
    },
  };
}

/* MCP speaks two HTTP transports, and which one a server wants is not a detail we get to
   guess: a Streamable-HTTP server answers the SSE handshake with 405, and an SSE server has
   no POST endpoint for Streamable HTTP to initialise against. Either way the connect fails,
   the server is logged as "unavailable" and quietly vanishes from the fleet.
   Servers declare their transport in mcp.json ("type" or "transport") and that declaration
   is authoritative. When one says nothing, try Streamable HTTP and fall back to SSE — the
   order the MCP spec prescribes, since SSE is the deprecated transport of the two. */
export function connectorsFor(config) {
  if (config.command) {
    return [
      [
        "stdio",
        (client) =>
          client.connect(
            new StdioClientTransport({
              command: config.command,
              args: config.args || [],
              env: childEnv(config.envFrom, config.env),
            })
          ),
      ],
    ];
  }

  if (!config.url) return [];

  /* Remote servers can require auth — whale-intel answers an unauthenticated handshake with
     401 — so headers have to be passable. `headersFrom` maps a header name to the ENV VAR
     holding its value, never the value itself: mcp.json is committed, and a bearer token in
     a committed file is a leaked bearer token. A header whose variable is unset is dropped
     rather than sent empty, so the failure reads as 401 instead of a confusing 400. */
  const headers = { ...(config.headers || {}) };
  for (const [header, envName] of Object.entries(config.headersFrom || {})) {
    const value = process.env[envName];
    if (value) headers[header] = value;
  }
  const options = Object.keys(headers).length ? { requestInit: { headers } } : undefined;

  const streamable = [
    "streamable-http",
    (client) => client.connect(new StreamableHTTPClientTransport(new URL(config.url), options)),
  ];
  const sse = [
    "sse",
    (client) => client.connect(new SSEClientTransport(new URL(config.url), options)),
  ];

  switch (String(config.transport || config.type || "").toLowerCase()) {
    case "sse":
      return [sse];
    case "http":
    case "streamable-http":
    case "streamablehttp":
      return [streamable];
    default:
      return [streamable, sse];
  }
}

/* Connects one server and lists its tools, or gives up within the budget. Never throws —
   a server that is down is a server we do without, not a dead chat endpoint.

   Every attempt and the listTools that follows share ONE deadline, so probing a second
   transport cannot lengthen a dead server's cold start: the worst case is the same as it
   was when there was only ever one attempt. A transport mismatch fails fast (405), which is
   what leaves the fallback almost all of the budget in the case that actually matters. */
async function connectServer(name, connectors, pick) {
  const deadline = Date.now() + MCP_CONNECT_TIMEOUT_MS * 2;
  const left = () => Math.max(deadline - Date.now(), 0);
  let lastError = new Error("no usable transport in mcp.json (needs command or url)");

  for (const [label, connect] of connectors) {
    if (left() === 0) break;
    const client = new Client({ name: `bugglo-${name}`, version: "1.0.0" });
    try {
      await withTimeout(connect(client), left(), `MCP ${name} connect over ${label}`);
      const listed = await withTimeout(client.listTools(), left(), `MCP ${name} listTools`);
      const picked = pick(listed.tools || []);
      /* Closing on the empty path too. A client whose tools were all filtered away still
         holds its socket — or, over stdio, a live child process that nothing would ever
         reap. */
      if (!picked.length) {
        await client.close().catch(() => {});
        return null;
      }
      return { name, client, picked, transport: label };
    } catch (e) {
      lastError = e;
      await client.close().catch(() => {});
    }
  }

  console.error(`MCP ${name}: unavailable — ${lastError?.message || lastError}`);
  return null;
}

async function createMcpState() {
  const mcpPath = path.join(process.cwd(), "mcp.json");
  let externalServers = {};
  if (fs.existsSync(mcpPath)) {
    try {
      externalServers = JSON.parse(fs.readFileSync(mcpPath, "utf8")).mcpServers;
    } catch (e) {
      console.error("Failed to parse mcp.json", e);
    }
  }

  const jobs = [
    connectServer(
      "robinx",
      connectorsFor({
        command: "npx",
        // No -y: resolve the robinx-mcp pinned in package.json rather than pulling latest from npm.
        args: ["robinx-mcp"],
        envFrom: ["ROBINX_WALLET_KEY", "ROBINX_MAX_USD_PER_CALL", "ROBINX_URL", "HOODSCOPE_URL"],
      }),
      (list) => {
        const allow = allowedToolNames();
        return list.filter((tool) => allow.has(tool.name));
      }
    ),
  ];

  for (const [name, config] of Object.entries(externalServers)) {
    if (config.disabled) continue;
    const connectors = connectorsFor(config);
    if (!connectors.length) continue;
    jobs.push(
      connectServer(name, connectors, (list) => filterExternalTools(name, list, config.allowedTools))
    );
  }

  /* In parallel, not one after another: nine servers behind an 8s cap is 8s, whereas the
     same nine in sequence was the 120s cold start that made the first request unusable. */
  const connected = (await Promise.all(jobs)).filter(Boolean);

  const mcpClients = [];
  const tools = [];
  const registry = new Map();
  // Stable order, so a tool's alias does not change between boots just because the network did.
  for (const server of connected.sort((a, b) => a.name.localeCompare(b.name))) {
    for (const tool of server.picked) tools.push(registerTool(registry, tool.name, server.client, tool));
    mcpClients.push(server.client);
    console.log(
      `Loaded MCP server: ${server.name} over ${server.transport} with ${server.picked.length} tools`
    );
  }

  if (!tools.length) {
    throw new Error("No MCP tools were successfully exposed by any server");
  }

  return { mcpClients, tools, registry };
}

/* What the MCP fleet is actually doing, as opposed to what the env vars imply. The health
   endpoint used to report `mcp: Boolean(mcpState)` — but mcpState is a LAZY cache, populated
   only by a chat turn, so a process that had not served one reported mcp:false whether the
   fleet was perfectly healthy or completely dead. It could not tell the two apart, which is
   why "live-ready" sat there green while the tool layer was actually down. Record the real outcome. */
let mcpStatus = { state: "cold", tools: 0, error: null, at: 0 };

export function mcpSnapshot() {
  return { ...mcpStatus };
}

async function getMcpState() {
  if (!mcpState) {
    mcpState = createMcpState()
      .then((state) => {
        mcpStatus = { state: "up", tools: state.tools.length, error: null, at: Date.now() };
        return state;
      })
      .catch((error) => {
        mcpStatus = {
          state: "down",
          tools: 0,
          error: String(error?.message || error).slice(0, 200),
          at: Date.now(),
        };
        mcpState = null;
        throw error;
      });
  }
  return mcpState;
}

/* Boots the fleet without a chat turn, so /api/health can answer "are the tools actually up?"
   instead of "are three env vars set?". Never throws: a probe that crashes the health endpoint
   is a health endpoint that reports the wrong thing at the worst moment. */
export async function probeMcp() {
  try {
    await getMcpState();
  } catch {
    // mcpStatus already records the failure; the snapshot below is the answer.
  }
  return mcpSnapshot();
}

/* ── FIRST-PARTY TOOLS ──────────────────────────────────────────────────────────────────────
   These do NOT come from MCP, and that is the entire point.

   The MCP fleet is third-party npm packages and remote servers; any of them can be down, and
   the general-purpose ones silently default to Ethereum. Asked to rug-check the real FOX token
   on Robinhood Chain, the fleet answered "not a contract — an empty wallet" about 4.8KB of live
   bytecode, and reported it had checked "Robinhood Chain (Mezo)". Mezo is a different chain.

   So the product's core promise — "tell me if this Robinhood Chain contract is a rug" — does not
   get to depend on that fleet. It is served by lib/chainData.js, which talks to chain 4663 and
   nothing else, and it is registered here so it is present in EVERY turn, including a turn where
   every MCP server failed to boot. */
const FIRST_PARTY_TOOLS = [
  {
    schema: {
      type: "function",
      function: {
        name: "robinhood_rug_check",
        description:
          "Rug-check a token contract on ROBINHOOD CHAIN (chain id 4663). This is the authoritative tool for Robinhood Chain contracts — prefer it over any general-purpose chain tool, which will default to Ethereum and wrongly report that the token does not exist. Reads bytecode, ERC-20 metadata, ownership, privileged functions (mint/pause/blacklist), proxy upgradeability, and DEX liquidity/age/sell activity. Every check comes back PASS, WARN, FAIL or UNKNOWN with its evidence, and the result always lists what it could NOT measure. It never guesses.",
        parameters: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "The token contract address (0x + 40 hex characters).",
            },
          },
          required: ["address"],
        },
      },
    },
    async run(args) {
      const { rugCheck } = await import("./chainData.js");
      return JSON.stringify(await rugCheck(String(args?.address || "")));
    },
  },
];

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated ${text.length - max} chars — narrow the query if you need the rest]`;
}

/* A failing tool is fed back to the model as text rather than thrown: the agent can then pick
   another route, which is the whole point of a tool loop. Throwing would burn the request. */
async function runTool(entry, rawArgs, budget, signal) {
  let args = {};
  if (rawArgs) {
    try {
      args = JSON.parse(rawArgs);
    } catch {
      return "error: arguments were not valid JSON — retry with a well-formed object";
    }
  }
  try {
    /* A first-party tool (lib/chainData.js) runs in-process — no MCP client, no child, no
       socket. It gets the same timeout and the same output budget as any other tool, because
       "ours" is not a reason to let it hang the turn or blow the context. */
    const payload = entry.run
      ? await withTimeout(entry.run(args), MCP_TOOL_TIMEOUT_MS, "first-party tool")
      : await callMcpTool(entry, args, signal);

    const room = Math.max(0, Math.min(MAX_TOOL_RESULT_CHARS, budget.remaining));
    if (room === 0) return "error: tool-output budget for this request is exhausted";
    budget.remaining -= Math.min(payload.length, room);
    return truncate(payload, room);
  } catch (error) {
    return `error: tool failed — ${String(error?.message || error).slice(0, 300)}`;
  }
}

async function callMcpTool(entry, args, signal) {
  /* Bounded twice on purpose. The SDK option is what actually cancels the in-flight
     request; withTimeout is the backstop for a transport that ignores it, because a tool
     call that never settles is the one failure that takes the whole endpoint down. */
  const result = await withTimeout(
    entry.client.callTool(
      { name: entry.mcpName, arguments: args },
      undefined,
      { timeout: MCP_TOOL_TIMEOUT_MS, signal }
    ),
    MCP_TOOL_TIMEOUT_MS + 1000,
    `tool ${entry.mcpName}`
  );
  const text = (result?.content || [])
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
  return text || JSON.stringify(result?.structuredContent ?? result ?? {});
}

/* The model is pinned by ROBINX_ENGINE_MODEL and there is no default anywhere in this file,
   so the app can never quietly answer on something else. Gateways can still route a request
   elsewhere — a variant, a fallback tier — so verify what actually served it and refuse the
   answer if it is not the model we asked for. */
function assertPinnedModel(response, expected) {
  const served = response?.model;
  if (!served) return; // gateway did not echo a model — nothing to check against

  const bare = (id) => String(id).split(":")[0]; // drop tier suffixes like ":free"
  const want = bare(expected);
  const got = bare(served);
  if (got === want) return;

  /* Providers serve the pinned model under a dated build id ("…-v3.2" → "…-v3.2-20251201").
     That is the same model and must pass, or live mode fails outright. What must NOT pass is
     a different variant of it — "-exp", "-terminus", a distinct model entirely — so accept a
     pure date suffix and nothing else. */
  const dated = new RegExp(`^${want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d{6,8}$`);
  if (dated.test(got)) return;

  throw new Error(`engine served "${served}" but ROBINX_ENGINE_MODEL pins "${expected}"`);
}

/* Sized so a real answer FITS. A cap that truncates mid-sentence does not save money — it
   spends the whole budget and delivers nothing, which is the most expensive outcome there
   is. The spend guard in lib/rateLimit.js is what bounds the bill; this only bounds one turn. */
function maxTokensForMode(mode) {
  if (mode === "Fast") return 1024;
  if (mode === "Deep") return 3500;
  return 2000;
}

function maxIterationsForMode(mode) {
  if (mode === "Fast") return 2;
  if (mode === "Deep") return 6;
  return 4;
}

export function liveBackendConfigured() {
  return Boolean(engineConfig());
}

export async function liveBackendHealth({ probe = false } = {}) {
  const mcp = probe ? await probeMcp() : mcpSnapshot();
  return {
    engine: Boolean(engineConfig()),
    /* "cold" is an honest third answer and the endpoint must be able to give it: it means no
       chat turn has booted the fleet yet, so we genuinely do not know. Collapsing that into
       `false` is what let a broken deploy look merely idle. Call with ?probe=1 to find out. */
    mcp: mcp.state,
    mcpTools: mcp.tools,
    mcpError: mcp.error,
    paidToolsEnabled: Boolean(process.env.ROBINX_WALLET_KEY),
  };
}

export { maxTokensForMode, maxIterationsForMode };

/* Whether a failure is the gateway refusing the SHAPE of the request rather than failing to
   serve it. A model without vision answers an image content-part with a 400/415/422, and that
   is a request we can usefully rewrite. A 429 or a 5xx is not — retrying those just pays twice
   for the same outage. */
function isContentRejection(error) {
  const status = Number(error?.status || error?.response?.status);
  return status >= 400 && status < 500 && status !== 429 && status !== 401 && status !== 403;
}

function imagesDroppedNote(message, count) {
  return (
    `${message}\n\n[Note: the user attached ${count} image${count > 1 ? "s" : ""}, but this model cannot read images. ` +
    `Say so plainly and ask them to describe it or paste the relevant text — do not guess at the contents.]`
  );
}

/* Appended to the system prompt when the MCP fleet is down. A model that is asked to rug-check
   a contract and handed no tools does not say "I can't" — it pattern-matches on what a rug
   check LOOKS like and emits a plausible score with plausible percentages. That is the exact
   failure this whole change exists to kill, so the model has to be told, in the prompt, that
   it is blind this turn and that inventing the numbers is not an option. */
const NO_TOOLS_NOTICE = `

---

## MOST OF YOUR DATA TOOLS ARE DOWN RIGHT NOW — READ THIS FIRST

The external tool fleet failed to start for this turn. Be precise about what that costs you:

**You still have \`robinhood_rug_check\`.** It is first-party and it is always available. If the
user asks about a Robinhood Chain contract, USE IT — it is not affected by this outage.

**You have nothing else.** No 𝕏/sentiment data, no trending, no prices, no wallet analysis, no
holder lists, no deployer history. You cannot verify any of those against anything.

So, for this turn only:

- If the user asks for something only the missing tools could answer, tell them plainly that
  those data sources are down right now and that you will not guess. Offer what you CAN do.
- **Never invent an address, price, percentage, holder count, risk score, verdict, or date.**
  A fabricated number here reaches someone who is about to spend money on it. There is no
  version of "close enough" that is acceptable.
- Everything that does NOT need live data — a greeting, who you are, what a honeypot is, how to
  read a liquidity lock, a general question — you answer completely normally. Be warm and useful.
  This notice is about missing DATA, not about refusing to talk.`;

/**
 * Runs the agentic loop and returns { kind: "text", text, usage, degraded }.
 * `usage` is what the caller charges against the budget — never drop it on the floor.
 * `degraded` means the answer is live but tool-less: true, but not chain-verified.
 */
export async function getLiveAgentReply({ message, mode, history, attachments = [], incognito = false, signal }) {
  const engine = getEngine();
  if (!engine) return null;

  /* A dead MCP fleet must NOT take the agent down with it.
     The engine is what ANSWERS; the tools only let it answer with evidence. This used to be a
     bare `await getMcpState()`, which throws when no server comes up. One flaky npx child on
     the box must not silently turn the whole product into fiction.
     Degrade, don't lie: answer tool-less, tell the model it has no data this turn (see
     NO_TOOLS_NOTICE — without it, a model asked about a contract with no tools will happily
     make the numbers up, which is the very thing we are fixing), and carry `degraded` out so
     the caller can badge the answer honestly. */
  let mcp = { tools: [], registry: new Map() };
  let degraded = false;
  try {
    mcp = await getMcpState();
  } catch (error) {
    degraded = true;
    console.error(
      `MCP DEGRADED — external tool fleet down, first-party tools only: ${error?.message || error}`
    );
  }

  /* First-party tools go in FIRST, and they are here whether or not MCP came up. That ordering
     is deliberate: the model reads the list top-down, and robinhood_rug_check is the one that is
     actually correct about this chain. A fresh registry per turn, so we never mutate the cached
     MCP state — two concurrent requests share that object. */
  const registry = new Map(mcp.registry);
  const tools = [];
  for (const tool of FIRST_PARTY_TOOLS) {
    registry.set(tool.schema.function.name, { run: tool.run });
    tools.push(tool.schema);
  }
  tools.push(...mcp.tools);

  const requestSignal = composeSignal(signal, Number(process.env.CHAT_TIMEOUT_MS || 25000));
  const maxTokens = maxTokensForMode(mode);
  const maxIterations = maxIterationsForMode(mode);

  const toolBudget = { remaining: MAX_TOOL_RESULT_CHARS_TOTAL };
  const usage = { prompt_tokens: 0, completion_tokens: 0, cost: 0 };
  let costKnown = false;

  const charge = (raw) => {
    if (!raw) return;
    usage.prompt_tokens += Number(raw.prompt_tokens || 0);
    usage.completion_tokens += Number(raw.completion_tokens || 0);
    if (typeof raw.cost === "number" && Number.isFinite(raw.cost)) {
      usage.cost += raw.cost;
      costKnown = true;
    }
  };

  /* One full agent run over one user turn. It owns its own `messages` array because the tool
     loop mutates it — a retry has to start from a clean transcript, not from the half-built
     one that just failed. */
  async function runAgent(userContent) {
    const messages = [
      {
        role: "system",
        content:
          (degraded ? BUGGLO_SYSTEM_PROMPT + NO_TOOLS_NOTICE : BUGGLO_SYSTEM_PROMPT) +
          (incognito
            ? "\n\nThis turn is marked Incognito by Bugglo. Do not ask the user to rely on saved chat history, and do not describe this request as retained by the application."
            : ""),
      },
      ...history.map((item) => ({ role: item.role, content: item.text })),
      { role: "user", content: userContent },
    ];

    // Only the gateway knows the true price; ask for it, and fall back to token maths if absent.
    const call = (tools, toolChoice) =>
      engine.client.chat.completions.create(
        {
          model: engine.model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.3,
          store: false,
          usage: { include: true },
          ...(tools ? { tools, tool_choice: toolChoice } : {}),
        },
        { signal: requestSignal }
      );

    let text = "";

    /* An empty tools array is not the same as no tools: some gateways reject `tools: []`
       outright, and the ones that accept it still bill for the field. Send nothing.
       In practice this is never empty now — the first-party tools are unconditional — but a
       future deploy could disable them, and a `tools: []` on the wire is a 400. */
    const offered = tools.length ? tools : null;

    for (let i = 0; i < maxIterations; i += 1) {
      const response = await call(offered, offered ? "auto" : undefined);
      assertPinnedModel(response, engine.model);
      charge(response?.usage);

      const reply = response?.choices?.[0]?.message;
      if (!reply) throw new Error("Live agent returned no message");

      messages.push(reply);

      const calls = reply.tool_calls || [];
      if (!calls.length) {
        text = typeof reply.content === "string" ? reply.content.trim() : "";
        break;
      }

      /* Tool calls in one turn are independent by construction, so run them together —
         serialising them would multiply the wall-clock of a Deep run by its fan-out. */
      const results = await Promise.all(
        calls.map(async (toolCall) => {
          const entry = registry.get(toolCall.function?.name);
          const content = entry
            ? await runTool(entry, toolCall.function?.arguments, toolBudget, requestSignal)
            : `error: no such tool "${toolCall.function?.name}"`;
          return { role: "tool", tool_call_id: toolCall.id, content };
        })
      );
      messages.push(...results);
    }

    /* Out of iterations while still calling tools: one last pass with the tools taken away, so
       the user gets the agent's best answer from what it already gathered instead of nothing. */
    if (!text) {
      const response = await call(null, undefined);
      assertPinnedModel(response, engine.model);
      charge(response?.usage);
      text = String(response?.choices?.[0]?.message?.content || "").trim();
    }

    return text;
  }

  const images = attachments.filter((a) => a.kind === "image");
  let text;

  try {
    text = await runAgent(buildUserContent(message, attachments));
  } catch (error) {
    /* The model is a deployment detail (see engineConfig), so whether it has eyes is not
       something this file can know ahead of time — it can only find out by asking. When the
       answer is no, re-ask without the pictures rather than dropping the user's question on
       the floor. The text attachments, and the tool loop, still work. */
    if (!images.length || !isContentRejection(error)) throw error;
    console.warn(
      `engine rejected ${images.length} image attachment(s); retrying text-only — ${error?.message || error}`
    );
    text = await runAgent(
      buildUserContent(
        imagesDroppedNote(message, images.length),
        attachments.filter((a) => a.kind === "text")
      )
    );
  }

  if (!text) {
    throw new Error("Live agent returned no text content");
  }

  /* usage.cost is seeded at 0, and 0 is a perfectly valid price as far as usageToUsd is
     concerned — so hand it the token counts ALONE when the gateway never quoted a cost.
     Passing the whole object would bill every such request at zero and the caps would
     never fire. */
  const tokens = { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens };
  return {
    kind: "text",
    text,
    degraded,
    usage: { ...tokens, cost: costKnown ? usage.cost : usageToUsd(tokens) },
  };
}
