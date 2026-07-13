/* Spend guard for the live engine.
 *
 * The engine bills per token, so an unguarded /api/chat is a direct hole in the wallet:
 * one scripted client can burn a month of budget in an afternoon. Request counting alone
 * does not close it — a single "Deep" request with six tool round-trips costs orders of
 * magnitude more than a one-shot "hi", so this guard meters MONEY, not just requests.
 *
 * Four independent gates, cheapest check first. Any one of them can say no:
 *   1. concurrency  — per user and global; stops a burst before it is even priced
 *   2. rate         — per minute / hour / day, per user
 *   3. user spend   — USD per user per day
 *   4. global spend — USD across everyone per day; the kill switch that caps the bill
 *
 * Cost is RESERVED at an upper bound before the call and RECONCILED to the real figure
 * after. Reserving matters: without it, N requests that pass the check at the same instant
 * can each spend the whole remaining budget. The reservation is what makes the cap a cap.
 *
 * Keyed on the SESSION identity, never on the client IP. clientKey()'s x-forwarded-for is
 * attacker-controlled unless a trusted proxy overwrites it, so an IP-keyed budget is a
 * budget with a bypass. A session is HMAC-signed by us, so it cannot be minted for free.
 *
 * State is per-process and in-memory. On a single server that is exactly right. Across
 * several instances each one enforces its own share, so the effective global cap is
 * (instances x ENGINE_GLOBAL_USD_PER_DAY) — set the env accordingly, or move this to Redis.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function num(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/* Deliberately tight. The point is that a real analysis still gets through — a Deep run with
   its tool round-trips fits inside these — while a script that hammers the endpoint does not.
 *
 * Why there is an IP axis at all, when every request is already tied to a signed session:
 * signing up is free. Wallet login in particular mints a brand-new identity for the cost of
 * a keypair, so a per-user cap alone is a cap an attacker can simply re-roll. The IP axis
 * makes one machine pay for all the identities it drives, and the global axis is the floor
 * under everything — that is the number that actually bounds the monthly bill. */
export function limits(guest = false) {
  const perMinute = num("ENGINE_MAX_PER_MINUTE", 5);
  const perDay = num("ENGINE_MAX_PER_DAY", 150);
  const userUsdPerDay = num("ENGINE_USER_USD_PER_DAY", 0.25);
  const prices = {
    priceInPerM: num("ENGINE_PRICE_INPUT_PER_MTOK", 0.3),
    priceOutPerM: num("ENGINE_PRICE_OUTPUT_PER_MTOK", 0.6),
  };

  /* GUEST TIER. A guest is an anonymous visitor with a free, re-mintable cookie, so their
     budget is pinned to their IP by the caller and the numbers here are what one IP gets
     per day — not what one cookie gets. Sized as a genuine taste of the product (enough
     turns to run a real rug check and read the answer) and no more; a visitor who wants
     more logs in. These are the caps that stand between an open endpoint and someone
     draining the engine credit for fun, so keep them mean. */
  if (guest) {
    const guestPerDay = num("GUEST_MAX_PER_DAY", 8);
    const guestUsdPerDay = num("GUEST_USD_PER_DAY", 0.04);
    return {
      ...prices,
      perMinute: num("GUEST_MAX_PER_MINUTE", 2),
      perHour: num("GUEST_MAX_PER_HOUR", 6),
      perDay: guestPerDay,
      userUsdPerDay: guestUsdPerDay,
      /* Deliberately NOT a multiple of the per-user cap, the way the signed-in tier is. For
         a signed-in user the two axes are different things — one account vs one machine
         driving many accounts — but a guest's "user" axis IS their IP, so a looser IP axis
         here would simply be a second, larger budget sitting behind the first and the tight
         one would never bind. Same numbers, so the cap means what it says. */
      ipPerMinute: num("GUEST_MAX_PER_MINUTE", 2),
      ipPerDay: guestPerDay,
      ipUsdPerDay: guestUsdPerDay,
      globalUsdPerDay: num("ENGINE_GLOBAL_USD_PER_DAY", 5),
      userConcurrent: num("GUEST_MAX_CONCURRENT", 1),
      globalConcurrent: num("ENGINE_MAX_CONCURRENT", 4),
    };
  }

  return {
    ...prices,
    perMinute,
    perHour: num("ENGINE_MAX_PER_HOUR", 40),
    perDay,
    userUsdPerDay,
    // An IP is allowed a bit more than one account, but not unlimited accounts.
    ipPerMinute: num("ENGINE_IP_MAX_PER_MINUTE", perMinute * 2),
    ipPerDay: num("ENGINE_IP_MAX_PER_DAY", perDay * 2),
    ipUsdPerDay: num("ENGINE_IP_USD_PER_DAY", userUsdPerDay * 2),
    globalUsdPerDay: num("ENGINE_GLOBAL_USD_PER_DAY", 5),
    userConcurrent: num("ENGINE_MAX_CONCURRENT_PER_USER", 1),
    globalConcurrent: num("ENGINE_MAX_CONCURRENT", 4),
  };
}

/* X-Forwarded-For is "client, proxy1, proxy2…" — and the LEFTMOST entry is whatever the
 * client itself sent, because a proxy only ever APPENDS the address it actually observed.
 * So the left end is attacker-controlled and worthless for rate limiting: anyone can rotate
 * it per request and reset their own bucket. The trustworthy value is the one your own edge
 * appended, counted from the RIGHT.
 *
 * ENGINE_TRUSTED_PROXIES is how many hops you run (Vercel/Cloudflare/one nginx = 1). Set it
 * to match your deployment: too low and you trust a forged hop, too high and every client
 * collapses into one bucket. With no proxy at all, fall back to the socket address.
 */
export function clientIpFrom(headers, socketAddress = "") {
  const hops = num("ENGINE_TRUSTED_PROXIES", 1);
  const chain = String(headers.get("x-forwarded-for") || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!chain.length) return socketAddress || headers.get("x-real-ip") || "local";
  const index = chain.length - hops;
  return chain[Math.max(0, index)] || chain[chain.length - 1];
}

/* Survives Next's dev-mode module reloads; without this the budget resets on every edit. */
function state() {
  if (!globalThis.__robinxBudget) {
    globalThis.__robinxBudget = {
      users: new Map(),
      global: { day: 0, usd: 0, inFlight: 0 },
    };
  }
  return globalThis.__robinxBudget;
}

function dayIndex(now) {
  return Math.floor(now / DAY_MS);
}

function rollDay(bucket, now) {
  const today = dayIndex(now);
  if (bucket.day !== today) {
    bucket.day = today;
    bucket.usd = 0;
  }
}

function msUntilNextDay(now) {
  return (dayIndex(now) + 1) * DAY_MS - now;
}

function userBucket(key, now) {
  const { users } = state();
  let bucket = users.get(key);
  if (!bucket) {
    bucket = { hits: [], day: dayIndex(now), usd: 0, inFlight: 0 };
    users.set(key, bucket);
  }
  rollDay(bucket, now);
  return bucket;
}

/* Idle sessions would otherwise accumulate forever in a long-lived process. */
function evictStale(now) {
  const { users } = state();
  if (users.size <= 5000) return;
  for (const [key, bucket] of users) {
    const last = bucket.hits[bucket.hits.length - 1] ?? 0;
    if (bucket.inFlight === 0 && now - last > DAY_MS) users.delete(key);
  }
}

/* Upper bound on what a request can cost, used as the reservation. Every iteration can emit
   max_tokens, and each one re-sends the whole transcript, so the input side grows roughly
   quadratically with iterations — hence the (i + 1) factor rather than a flat multiply. */
export function estimateRequestUsd({ maxTokens, maxIterations, promptChars }) {
  const { priceInPerM, priceOutPerM } = limits();
  const basePromptTokens = Math.ceil(promptChars / 4);
  let inputTokens = 0;
  for (let i = 0; i < maxIterations; i += 1) {
    inputTokens += basePromptTokens + i * maxTokens;
  }
  const outputTokens = maxTokens * maxIterations;
  return (inputTokens / 1e6) * priceInPerM + (outputTokens / 1e6) * priceOutPerM;
}

/* The gateway returns the true billed cost when asked for it; the token maths is only the
   fallback for a provider that does not, and will be wrong if the env prices are stale. */
export function usageToUsd(usage) {
  if (!usage) return 0;
  if (typeof usage.cost === "number" && Number.isFinite(usage.cost)) return usage.cost;
  const { priceInPerM, priceOutPerM } = limits();
  const input = Number(usage.prompt_tokens || 0);
  const output = Number(usage.completion_tokens || 0);
  return (input / 1e6) * priceInPerM + (output / 1e6) * priceOutPerM;
}

function denied(reason, retryAfterMs) {
  return { ok: false, reason, retryAfterMs: Math.max(1000, Math.ceil(retryAfterMs)) };
}

/* Oldest hit inside the window decides when a slot frees up. */
function retryAfterFor(hits, windowMs, max, now) {
  const inWindow = hits.filter((t) => now - t < windowMs);
  if (inWindow.length < max) return 1000;
  return inWindow[inWindow.length - max] + windowMs - now;
}

/**
 * Claim capacity for one live request, against BOTH the session and the source IP.
 *
 * On success the caller MUST call release(), and should call settle(actualUsd) once the
 * real cost is known, so the reservation is corrected — otherwise the budget drains at the
 * estimated rate (an upper bound) rather than the true one, and throttles far too early.
 */
export function acquire({ userKey, ipKey, guest = false }, estimatedUsd) {
  const L = limits(guest);
  const now = Date.now();
  const g = state().global;
  rollDay(g, now);

  const u = userBucket(`u:${userKey}`, now);
  const ip = userBucket(`ip:${ipKey}`, now);

  if (g.inFlight >= L.globalConcurrent) return denied("global-concurrency", 2000);
  if (u.inFlight >= L.userConcurrent) return denied("user-concurrency", 2000);

  const axes = [
    { b: u, perMinute: L.perMinute, perHour: L.perHour, perDay: L.perDay, usd: L.userUsdPerDay, tag: "user" },
    { b: ip, perMinute: L.ipPerMinute, perHour: Infinity, perDay: L.ipPerDay, usd: L.ipUsdPerDay, tag: "ip" },
  ];

  /* A guest's "user" identity IS their IP — the caller pins it there because the cookie is
     free to re-mint — so the two axes are one budget wearing two hats. Charging both would
     bill every guest turn twice against caps that are already the same number. Collapse to
     one axis when they are the same identity, and the cap means what the env says it means. */
  if (userKey === ipKey) axes.length = 1;

  for (const axis of axes) {
    const { b } = axis;
    b.hits = b.hits.filter((t) => now - t < DAY_MS);
    const since = (ms) => b.hits.reduce((n, t) => (now - t < ms ? n + 1 : n), 0);

    if (since(MINUTE_MS) >= axis.perMinute) {
      return denied(`${axis.tag}-rate-minute`, retryAfterFor(b.hits, MINUTE_MS, axis.perMinute, now));
    }
    if (since(HOUR_MS) >= axis.perHour) {
      return denied(`${axis.tag}-rate-hour`, retryAfterFor(b.hits, HOUR_MS, axis.perHour, now));
    }
    if (b.hits.length >= axis.perDay) {
      return denied(`${axis.tag}-rate-day`, msUntilNextDay(now));
    }

    /* Reserve against the CAP, not against the spend so far: a request that would tip the
       day over its ceiling is refused before it runs, not noticed after it cost money. */
    if (b.usd + estimatedUsd > axis.usd) return denied(`${axis.tag}-spend`, msUntilNextDay(now));
  }

  if (g.usd + estimatedUsd > L.globalUsdPerDay) return denied("global-spend", msUntilNextDay(now));

  for (const { b } of axes) {
    b.hits.push(now);
    b.usd += estimatedUsd;
  }
  u.inFlight += 1;
  g.inFlight += 1;
  g.usd += estimatedUsd;
  evictStale(now);

  let settled = false;
  let released = false;
  return {
    ok: true,
    settle(actualUsd) {
      if (settled) return;
      settled = true;
      const delta = Math.max(0, actualUsd) - estimatedUsd;
      for (const { b } of axes) b.usd = Math.max(0, b.usd + delta);
      g.usd = Math.max(0, g.usd + delta);
    },
    release() {
      if (released) return;
      released = true;
      u.inFlight = Math.max(0, u.inFlight - 1);
      g.inFlight = Math.max(0, g.inFlight - 1);
    },
  };
}

export function budgetSnapshot() {
  const L = limits();
  const now = Date.now();
  const g = state().global;
  rollDay(g, now);
  return {
    spentUsdToday: Number(g.usd.toFixed(4)),
    capUsdToday: L.globalUsdPerDay,
    inFlight: g.inFlight,
    trackedUsers: state().users.size,
  };
}

function axisSnapshot(bucket, L, prefix) {
  return {
    requestsToday: bucket.hits.length,
    requestsPerDay: L[`${prefix}PerDay`],
    spentUsdToday: Number(bucket.usd.toFixed(4)),
    capUsdToday: L[`${prefix}UsdPerDay`],
    inFlight: bucket.inFlight,
  };
}

export function usageSnapshot({ userKey, ipKey, guest = false }) {
  const L = limits(guest);
  const now = Date.now();
  const g = state().global;
  rollDay(g, now);
  const user = userBucket(`u:${userKey}`, now);
  const ip = userKey === ipKey ? user : userBucket(`ip:${ipKey}`, now);
  return {
    guest,
    user: axisSnapshot(user, L, "user"),
    ip: axisSnapshot(ip, L, "ip"),
    global: {
      spentUsdToday: Number(g.usd.toFixed(4)),
      capUsdToday: L.globalUsdPerDay,
      inFlight: g.inFlight,
      concurrentLimit: L.globalConcurrent,
    },
    limits: {
      perMinute: L.perMinute,
      perHour: L.perHour,
      perDay: L.perDay,
      userConcurrent: L.userConcurrent,
      globalConcurrent: L.globalConcurrent,
    },
  };
}
