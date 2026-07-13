import { randomBytes } from "node:crypto";
import { guestSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/guest → { user } + a signed, guest-provider session cookie.
 *
 * A guest cookie is NOT an identity claim. Anyone can call this endpoint and get one, and
 * that is fine: its only job is to let a visitor's turns reach the live engine, because the
 * alternative we shipped before was answering them from a local browser script
 * and calling it an answer.
 *
 * The cookie therefore buys no trust and MUST NOT be what a budget is keyed on — it can be
 * re-minted for free, so a per-session cap is a cap the holder resets at will. The chat
 * route pins a guest's spend to their IP for exactly that reason (see lib/rateLimit.js,
 * guest tier). Read that before loosening anything here.
 */
export async function POST() {
  const user = {
    provider: "guest",
    sub: randomBytes(12).toString("base64url"),
    name: "Guest",
  };

  return Response.json(
    { user },
    { headers: { "Set-Cookie": guestSessionCookie(user) } }
  );
}
