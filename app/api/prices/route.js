import { getPrices } from "@/lib/priceFeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/prices → { ok, source, items: [{ pair, symbol, price, change }], fetchedAt, stale? }
 *
 * Public and unauthenticated on purpose: this is the ticker strip, it renders before anyone
 * has signed in, and the data is already public market data. No session, so nothing to leak.
 *
 * It is also cheap to abuse and cheap to serve: lib/priceFeed.js collapses every caller into
 * one upstream call per 30s, so a flood costs us cached JSON rather than upstream rate limit.
 * That is why there is no rate limiter here — there is no per-request cost to protect.
 *
 * `ok: false` with an empty `items` is a legitimate, expected response. It means both upstream
 * sources are unreachable. It does NOT mean "render placeholders" — see TickerTape.jsx.
 */
export async function GET() {
  const payload = await getPrices();

  return Response.json(payload, {
    status: payload.ok ? 200 : 503,
    /* Let the CDN/proxy serve the same second of prices to everyone, and keep showing the last
       copy for a minute while a refresh is in flight, so nobody watches an empty strip. */
    headers: {
      "Cache-Control": payload.ok
        ? "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
        : "no-store",
    },
  });
}
