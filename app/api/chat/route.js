import { demoAgent } from "@/lib/demoAgent";
import { parseChatRequest, sourceFromReply } from "@/lib/chatContract";
import { getLiveAgentReply, liveBackendConfigured } from "@/lib/liveAgent";
import { getSessionFromRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const buckets = globalThis.__hoodscopeRateBuckets ?? new Map();
globalThis.__hoodscopeRateBuckets = buckets;

function clientKey(req) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

function rateLimit(req) {
  const now = Date.now();
  const key = clientKey(req);
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return Response.json(
      { error: "rate limit exceeded", retryAfterMs: WINDOW_MS - (now - bucket.startedAt) },
      { status: 429 }
    );
  }
  return null;
}

/**
 * POST /api/chat  { message, mode, history[] }
 *   → { reply: string | { kind: "text"|"rugcheck"|"trending"|"sentiment"|"wallet", ... } }
 *
 * ─────────────────────────────────────────────────────────────────────
 * LIVE MODE (Claude API + robinx-mcp)
 * ─────────────────────────────────────────────────────────────────────
 *   Set ANTHROPIC_API_KEY in .env.local to enable live Claude + RobinX MCP mode.
 *   Optional: ANTHROPIC_MODEL, ROBINX_WALLET_KEY, ROBINX_ALLOWED_TOOLS,
 *   ROBINX_MAX_USD_PER_CALL, ROBINX_URL, CHAT_TIMEOUT_MS.
 *
 *   Without ANTHROPIC_API_KEY, or when the live backend fails, the route returns
 *   the deterministic demo agent with source:"demo".
 * ─────────────────────────────────────────────────────────────────────
 */
export async function POST(req) {
  const session = getSessionFromRequest(req);
  if (!session) return unauthorizedResponse();

  const limited = rateLimit(req);
  if (limited) return limited;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = parseChatRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  const { message, mode, history } = parsed.value;
  if (liveBackendConfigured()) {
    try {
      const reply = await getLiveAgentReply({ message, mode, history, signal: req.signal });
      if (reply) {
        return Response.json({ reply, source: "live", backend: "anthropic+robinx-mcp" });
      }
    } catch (error) {
      console.error("live chat backend failed; falling back to demo", error);
    }
  } else {
    await new Promise((r) => setTimeout(r, 250));
  }

  const reply = demoAgent(message);
  return Response.json({ reply, source: sourceFromReply(reply), backend: "demo" });
}
