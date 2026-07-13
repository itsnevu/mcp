/* Live prices for the ticker tape.
 *
 * This file exists because the ticker must fetch a real market feed before it prints a price.
 *
 * The rule this module is built to: WE DO NOT INVENT A PRICE. Not a substitute, not a last
 * known value, not a zero. When both sources fail, the honest return is an empty list and
 * `ok: false`, and the ticker renders as unavailable. A wrong price on a trading surface is
 * not a cosmetic bug.
 *
 * Sources, in order:
 *   1. GeckoTerminal — has a real `robinhood` network with a top-pools-by-volume endpoint,
 *      which is exactly the query a ticker needs. No key. ~30 req/min on the free tier, which
 *      the cache below keeps us far under.
 *   2. DexScreener — no "top pools per chain" endpoint, so it can only confirm pairs we can
 *      name. Used as a fallback so a GeckoTerminal outage degrades instead of blanking.
 */

const GT_NETWORK = process.env.PRICE_FEED_NETWORK || "robinhood";
const GT_URL = `https://api.geckoterminal.com/api/v2/networks/${GT_NETWORK}/pools?sort=h24_volume_usd_desc&page=1`;
const DEX_URL = `https://api.dexscreener.com/latest/dex/search?q=USDG`;

/* A ticker is ambient furniture, not a trading terminal — nobody is arbitraging off a scroll
   bar. 30s of staleness is invisible to a reader and keeps us to ~2 upstream calls a minute
   no matter how many people have the tab open, which is what stops a busy day from getting
   the whole deployment rate-limited by GeckoTerminal. */
const CACHE_MS = Number(process.env.PRICE_CACHE_MS) || 30_000;
const FETCH_TIMEOUT_MS = Number(process.env.PRICE_FETCH_TIMEOUT_MS) || 8000;
const MAX_ITEMS = Number(process.env.PRICE_MAX_ITEMS) || 10;

/* How long a good payload may outlive its refresh before we stop showing it. A 30-second-old
   price is fine to keep on screen through a blip upstream. A five-minute-old one is a stale
   number wearing a live badge, and at that point "unavailable" is the truthful render. */
const MAX_STALE_MS = Number(process.env.PRICE_MAX_STALE_MS) || 300_000;

/* Pools below this are noise: a $200 pool's "price" is whatever the last person to touch it
   decided, and its 24h change is routinely ±99%. Showing those next to real pairs makes the
   whole strip look fake — which is the reputation we are trying to shed here. */
const MIN_LIQUIDITY_USD = Number(process.env.PRICE_MIN_LIQUIDITY_USD) || 5000;

/* Survives Next's dev-mode module reloads, and shared across requests in prod — the point of
   the cache is that N concurrent readers cost ONE upstream call, so it cannot be per-request. */
function cache() {
  if (!globalThis.__buggloPriceCache) {
    globalThis.__buggloPriceCache = { at: 0, payload: null, inFlight: null };
  }
  return globalThis.__buggloPriceCache;
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

/* A memecoin can trade at 0.0000000023 and a stable at 1.0012, and one fixed precision cannot
   serve both — %.4f renders the memecoin as "0.0000", which is not a price, it is a zero.
   Scale the decimals to the magnitude so every row shows significant digits. */
export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(5);
  if (n >= 0.0001) return n.toFixed(7);
  return n.toPrecision(3); // deep-sub-cent: "2.30e-9" beats a row of zeroes
}

/* A token that launched this morning really is up 1,752,690% on the day — that is not a bug,
   it is what a fresh pool does. But printed raw in a scrolling strip it reads as a broken
   number, and a ticker that looks fake undermines the exact trust we are rebuilding here.
   So compact it — "+1.8M%" — which is the same fact, legible. We do NOT clamp it to some
   comfortable "+999%": that would be a smaller number than the truth, i.e. a lie. */
export function formatChange(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs >= 1e6) return Number((n / 1e6).toFixed(1)) + "M";
  if (abs >= 1e3) return Number((n / 1e3).toFixed(1)) + "K";
  return String(Number(n.toFixed(abs >= 100 ? 0 : 2)));
}

/* GeckoTerminal names a pool "CALLIE / WETH" — and, when the DEX exposes a fee tier, appends
   it: "USDG / WETH 0.01%". Split on the slash and drop that trailing tier, or every quote
   symbol reads "WETH 0.01%". */
function parsePoolName(name) {
  const [rawBase, rawQuote] = String(name || "").split("/");
  const base = String(rawBase || "").trim();
  const quote = String(rawQuote || "").trim().replace(/\s+[\d.]+%$/, "");
  if (!base || !quote) return null;
  return { base, quote };
}

function fromGeckoTerminal(json) {
  const pools = Array.isArray(json?.data) ? json.data : [];
  return pools
    .map((pool) => {
      const a = pool?.attributes || {};
      const pair = parsePoolName(a.name);
      const price = formatPrice(a.base_token_price_usd);
      if (!pair || !price) return null;

      const liquidity = Number(a.reserve_in_usd || 0);
      if (!Number.isFinite(liquidity) || liquidity < MIN_LIQUIDITY_USD) return null;

      /* No change figure means we do not know it — so we do not print one. Rendering an
         unknown as "+0.0%" is a claim that the price held flat, which we cannot support. */
      const change = formatChange(a.price_change_percentage?.h24);

      return {
        pair: `${pair.base}/${pair.quote}`,
        symbol: pair.base,
        price,
        // `change` is the display string ("1.8M", "-99.02"); `up` carries the sign separately,
        // because the renderer needs to colour the row and cannot parse "1.8M" back to a number.
        change,
        up: change === null ? null : Number(a.price_change_percentage?.h24) >= 0,
        liquidity,
        volume: Number(a.volume_usd?.h24 || 0),
      };
    })
    .filter(Boolean);
}

function fromDexScreener(json) {
  const pairs = Array.isArray(json?.pairs) ? json.pairs : [];
  return pairs
    .filter((p) => p?.chainId === GT_NETWORK)
    .map((p) => {
      const base = p.baseToken?.symbol;
      const quote = p.quoteToken?.symbol;
      const price = formatPrice(p.priceUsd);
      if (!base || !quote || !price) return null;

      const liquidity = Number(p.liquidity?.usd || 0);
      if (!Number.isFinite(liquidity) || liquidity < MIN_LIQUIDITY_USD) return null;

      const change = formatChange(p.priceChange?.h24);

      return {
        pair: `${base}/${quote}`,
        symbol: base,
        price,
        change,
        up: change === null ? null : Number(p.priceChange?.h24) >= 0,
        liquidity,
        volume: Number(p.volume?.h24 || 0),
      };
    })
    .filter(Boolean);
}

/* One token can have several pools (fee tiers, forks). The ticker wants ONE row per token —
   the deepest one, since that is the pool whose price the token actually trades at. */
function topByToken(items) {
  const best = new Map();
  for (const item of items) {
    const seen = best.get(item.symbol);
    if (!seen || item.liquidity > seen.liquidity) best.set(item.symbol, item);
  }
  return [...best.values()]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, MAX_ITEMS)
    .map(({ liquidity, volume, ...row }) => row);
}

async function fetchPrices() {
  const errors = [];

  for (const [name, url, parse] of [
    ["geckoterminal", GT_URL, fromGeckoTerminal],
    ["dexscreener", DEX_URL, fromDexScreener],
  ]) {
    try {
      const items = topByToken(parse(await getJson(url)));
      if (items.length) return { ok: true, source: name, items, fetchedAt: Date.now() };
      errors.push(`${name}: returned no usable pairs`);
    } catch (error) {
      errors.push(`${name}: ${error?.message || error}`);
    }
  }

  /* Both sources are down. Say so and show nothing. The tempting move here — keep serving the
     last good payload forever, or fall back to a local list — is exactly how bad data ends up
     in production pretending to be a market. */
  console.error(`price feed unavailable — ${errors.join("; ")}`);
  return { ok: false, source: null, items: [], fetchedAt: Date.now(), error: "price feed unavailable" };
}

/**
 * Cached live prices: { ok, source, items: [{ pair, symbol, price, change }], fetchedAt }.
 * `items` is empty and `ok` is false when no source could be reached. It is NEVER invented.
 */
export async function getPrices() {
  const c = cache();
  const now = Date.now();

  if (c.payload && now - c.at < CACHE_MS) return c.payload;

  /* Collapse a thundering herd into one upstream call: on a cold cache, ten simultaneous
     readers would otherwise fire ten identical requests and trip the rate limit together. */
  if (!c.inFlight) {
    c.inFlight = fetchPrices()
      .then((payload) => {
        if (payload.ok) {
          c.payload = payload;
          c.at = Date.now();
          return c.payload;
        }

        /* The refresh failed. Keep a good-but-stale payload on screen through a short blip —
           blanking the strip because one request timed out would be its own kind of lie. But
           only up to MAX_STALE_MS: past that we stop pretending, drop the old numbers, and
           report unavailable. Note c.at is deliberately NOT bumped, so the stale copy keeps
           ageing toward that cutoff instead of being refreshed into immortality. */
        const good = c.payload?.ok ? c.payload : null;
        const age = good ? Date.now() - c.at : Infinity;
        if (good && age < MAX_STALE_MS) return { ...good, stale: true };

        c.payload = payload;
        c.at = Date.now();
        return c.payload;
      })
      .finally(() => {
        c.inFlight = null;
      });
  }

  return c.inFlight;
}
