import { parseChatRequest } from "@/lib/chatContract";
import { attachmentPromptChars } from "@/lib/attachments";
import {
  getLiveAgentReply,
  liveBackendConfigured,
  maxTokensForMode,
  maxIterationsForMode,
  withTimeout,
} from "@/lib/liveAgent";
import { acquire, estimateRequestUsd, usageToUsd, clientIpFrom } from "@/lib/rateLimit";
import { getSessionFromRequest, isGuestSession, unauthorizedResponse } from "@/lib/auth";

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

/* A guest who has spent their free turns is not an attacker being stonewalled — they are a
   visitor who reached the end of the free tier, and the useful thing to tell them is exactly
   that, plus how to get more. This is the ONE case where we name the limit: the guest quota
   is a published product boundary, not a secret to protect. Every other denial stays behind
   the uniform "server busy" so nobody can map our caps by probing them. */
function guestLimitReached(retryAfterMs) {
  const ms = Math.max(1000, Math.ceil(retryAfterMs));
  return Response.json(
    {
      error: "You've used up the free guest turns. Sign in to keep going.",
      busy: true,
      guestLimit: true,
      retryAfterMs: ms,
    },
    { status: 429, headers: { "Retry-After": String(Math.ceil(ms / 1000)) } }
  );
}

/* What a broken backend is allowed to say. Note what it does NOT do: return a
   reply. There is no such thing as a safe invented answer for "is this contract a rug" —
   an outage that looks like an answer is worse than an outage that looks like an outage. */
function engineUnavailable() {
  return Response.json(
    {
      error: "The live engine is unavailable right now. Please try again shortly.",
      unavailable: true,
    },
    { status: 503 }
  );
}

/**
 * POST /api/chat  { message, mode, history[], attachments[] }
 *   attachments are { kind: "image", dataUrl } | { kind: "text", text } — see lib/attachments.js.
 *   They are read on the CURRENT turn only and are never replayed in history, so a chat with a
 *   file in it does not re-bill that file on every subsequent question.
 *   → { reply: string | { kind: "text"|"rugcheck"|"trending"|"sentiment"|"wallet", ... } }
 *   → 429 { error, busy: true, retryAfterMs } when over a limit or over budget
 *
 * ─────────────────────────────────────────────────────────────────────
 * LIVE MODE (RobinX engine + robinx-mcp)
 * ─────────────────────────────────────────────────────────────────────
 *   Set ROBINX_ENGINE_KEY, ROBINX_ENGINE_URL and ROBINX_ENGINE_MODEL in .env.local to
 *   enable answers. All three are required; any one missing returns 503.
 *
 *   Optional: ROBINX_WALLET_KEY, ROBINX_ALLOWED_TOOLS, ROBINX_MAX_USD_PER_CALL, ROBINX_URL,
 *   CHAT_TIMEOUT_MS, and the spend caps documented in lib/rateLimit.js.
 *
 *   Missing keys or a failing live backend return 503. Being over budget returns 429.
 *   Quietly serving made-up numbers to someone who asked a real question about their money is
 *   worse than serving nothing.
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

  const { message, mode, history, attachments, incognito } = parsed.value;

  if (liveBackendConfigured()) {
    /* Metered on two axes at once. The session is signed by us, so it cannot be forged —
       but it CAN be re-minted for free (a wallet login is just a fresh keypair), so a
       per-session cap alone is one an attacker simply re-rolls. The IP axis makes one
       machine pay for every identity it drives, and the global cap sits under both. */
    const guest = isGuestSession(session);
    /* A guest cookie is handed out by /api/auth/guest to anyone who asks, so `sub` is not an
       identity — it is a fresh random string every time you clear a cookie. Keying a guest's
       budget on it would be keying it on a value the holder re-rolls at will, i.e. no budget
       at all. Pin them to the one thing they cannot mint for free: the IP. That is also why
       userKey and ipKey are deliberately the SAME string here — see the collapse in acquire(). */
    const userKey = guest ? `guest-ip:${ip}` : `${session.provider}:${session.sub}`;
    const ipKey = guest ? `guest-ip:${ip}` : ip;
    /* Attachments are prompt, and prompt is money — an image is worth more per byte than
       anything the user could type. Price them in, or a request with four files sails through
       a cap sized for a sentence. */
    const promptChars =
      message.length +
      history.reduce((n, item) => n + item.text.length, 0) +
      attachmentPromptChars(attachments) +
      4000; // + system prompt
    const estimate = estimateRequestUsd({
      maxTokens: maxTokensForMode(mode),
      maxIterations: maxIterationsForMode(mode),
      promptChars,
    });

    const claim = acquire({ userKey, ipKey, guest }, estimate);
    if (!claim.ok) {
      console.warn(`chat over limit (${claim.reason}) user=${userKey} ip=${ip} guest=${guest}`);
      /* "Sign in to keep going" is only true when signing in would ACTUALLY help — i.e. the
         guest has exhausted their day or their spend. It is false, and infuriating, for a
         per-minute burst limit: there the user simply typed twice quickly, has turns left, and
         needs to wait ten seconds. Telling them to go and create an account to fix that is a
         lie the UI would tell every impatient visitor. Split on which cap actually bit.

         Note a global-* denial is never the guest's fault either — that is our budget, not
         theirs, and it stays behind the uniform "server busy". */
      const exhausted = claim.reason === "user-rate-day" || claim.reason === "user-spend";
      if (guest && exhausted) return guestLimitReached(claim.retryAfterMs);
      return serverBusy(claim.retryAfterMs);
    }

    try {
      /* The last line of defence for the in-flight slot. Everything below this already has
         its own timeout, but if any of them ever fails to fire, the request would park
         forever, claim.release() would never run, and the endpoint would answer "server
         busy" to everyone until someone restarted the process. One stuck call must not be
         able to take the app down, so bound the whole thing regardless. */
      const reply = await withTimeout(
        getLiveAgentReply({ message, mode, history, attachments, incognito, signal: req.signal }),
        Number(process.env.CHAT_HARD_DEADLINE_MS) || 45000,
        "chat request"
      );
      if (reply) {
        // Correct the reservation to what the call actually cost, or the cap drains at the
        // estimated rate — which is an upper bound, and would throttle far too early.
        claim.settle(usageToUsd(reply.usage));
        const { usage, degraded, ...payload } = reply;
        /* `degraded` = the engine answered but its chain tools were down, so this is a real
           model answer with no chain data behind it. The UI must not
           badge it as such — but it is not tool-verified either, and pretending otherwise is
           how an unverified claim gets read as a verified one. Say which it is. */
        return Response.json({
          reply: payload,
          source: "live",
          degraded: Boolean(degraded),
          backend: degraded ? "robinx-engine (tools offline)" : "robinx-engine+robinx-mcp",
        });
      }
      claim.settle(0);
    } catch (error) {
      // The call may have burned tokens before it threw, so leave the reservation standing
      // rather than refunding it. Erring toward over-charging ourselves is the safe direction.
      console.error("LIVE CHAT FAILED — serving 503, not synthesizing an answer", error);
    } finally {
      claim.release();
    }

    return engineUnavailable();
  }

  console.error("ROBINX_ENGINE_* not configured — /api/chat cannot answer");
  return engineUnavailable();
}
