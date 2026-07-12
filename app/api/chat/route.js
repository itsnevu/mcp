import { demoAgent } from "@/lib/demoAgent";
import { parseChatRequest, sourceFromReply } from "@/lib/chatContract";
import {
  getLiveAgentReply,
  liveBackendConfigured,
  maxTokensForMode,
  maxIterationsForMode,
  withTimeout,
} from "@/lib/liveAgent";
import { acquire, estimateRequestUsd, usageToUsd, clientIpFrom } from "@/lib/rateLimit";
import { getSessionFromRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const buckets = globalThis.__hoodscopeRateBuckets ?? new Map();
globalThis.__hoodscopeRateBuckets = buckets;

/* Coarse flood brake in front of everything, including the unauthenticated path. The spend
   caps in lib/rateLimit.js are the ones that protect the bill; this only stops a firehose
   from reaching them. Both use clientIpFrom(), which counts hops from the RIGHT — the left
   end of x-forwarded-for is whatever the client typed and resets itself on demand. */
function rateLimit(req, ip) {
  const now = Date.now();
  const key = ip;
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return serverBusy(WINDOW_MS - (now - bucket.startedAt));
  }
  return null;
}

/* One shape for every kind of "not now", so the client cannot tell a flood brake from an
   exhausted budget — and neither can anyone probing the endpoint to map our limits. The
   real reason is logged server-side, where it is useful and not an invitation. */
function serverBusy(retryAfterMs) {
  const ms = Math.max(1000, Math.ceil(retryAfterMs));
  return Response.json(
    { error: "Server busy — please try again in a moment.", busy: true, retryAfterMs: ms },
    { status: 429, headers: { "Retry-After": String(Math.ceil(ms / 1000)) } }
  );
}

/**
 * POST /api/chat  { message, mode, history[] }
 *   → { reply: string | { kind: "text"|"rugcheck"|"trending"|"sentiment"|"wallet", ... } }
 *   → 429 { error, busy: true, retryAfterMs } when over a limit or over budget
 *
 * ─────────────────────────────────────────────────────────────────────
 * LIVE MODE (RobinX engine + robinx-mcp)
 * ─────────────────────────────────────────────────────────────────────
 *   Set ROBINX_ENGINE_KEY, ROBINX_ENGINE_URL and ROBINX_ENGINE_MODEL in .env.local to
 *   enable live mode. All three are required; any one missing keeps the app in demo mode.
 *
 *   Optional: ROBINX_WALLET_KEY, ROBINX_ALLOWED_TOOLS, ROBINX_MAX_USD_PER_CALL, ROBINX_URL,
 *   CHAT_TIMEOUT_MS, and the spend caps documented in lib/rateLimit.js.
 *
 *   Without those keys, or when the live backend fails, the route returns the deterministic
 *   demo agent with source:"demo" — which the UI badges as demo data. Note that being over
 *   budget does NOT fall back to demo: it returns 429, because quietly serving mock numbers
 *   to someone who asked a real question about their money is worse than serving nothing.
 * ─────────────────────────────────────────────────────────────────────
 */
export async function POST(req) {
  const ip = clientIpFrom(req.headers);

  const session = getSessionFromRequest(req);
  if (!session) return unauthorizedResponse();

  const limited = rateLimit(req, ip);
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
    /* Metered on two axes at once. The session is signed by us, so it cannot be forged —
       but it CAN be re-minted for free (a wallet login is just a fresh keypair), so a
       per-session cap alone is one an attacker simply re-rolls. The IP axis makes one
       machine pay for every identity it drives, and the global cap sits under both. */
    const userKey = `${session.provider}:${session.sub}`;
    const promptChars =
      message.length + history.reduce((n, item) => n + item.text.length, 0) + 4000; // + system prompt
    const estimate = estimateRequestUsd({
      maxTokens: maxTokensForMode(mode),
      maxIterations: maxIterationsForMode(mode),
      promptChars,
    });

    const claim = acquire({ userKey, ipKey: ip }, estimate);
    if (!claim.ok) {
      console.warn(`chat over limit (${claim.reason}) user=${userKey} ip=${ip}`);
      return serverBusy(claim.retryAfterMs);
    }

    try {
      /* The last line of defence for the in-flight slot. Everything below this already has
         its own timeout, but if any of them ever fails to fire, the request would park
         forever, claim.release() would never run, and the endpoint would answer "server
         busy" to everyone until someone restarted the process. One stuck call must not be
         able to take the app down, so bound the whole thing regardless. */
      const reply = await withTimeout(
        getLiveAgentReply({ message, mode, history, signal: req.signal }),
        Number(process.env.CHAT_HARD_DEADLINE_MS) || 45000,
        "chat request"
      );
      if (reply) {
        // Correct the reservation to what the call actually cost, or the cap drains at the
        // estimated rate — which is an upper bound, and would throttle far too early.
        claim.settle(usageToUsd(reply.usage));
        const { usage, ...payload } = reply;
        return Response.json({ reply: payload, source: "live", backend: "robinx-engine+robinx-mcp" });
      }
      claim.settle(0);
    } catch (error) {
      // The call may have burned tokens before it threw, so leave the reservation standing
      // rather than refunding it. Erring toward over-charging ourselves is the safe direction.
      console.error("live chat backend failed; falling back to demo", error);
    } finally {
      claim.release();
    }
  } else {
    await new Promise((r) => setTimeout(r, 250));
  }

  const reply = demoAgent(message);
  return Response.json({ reply, source: sourceFromReply(reply), backend: "demo" });
}
