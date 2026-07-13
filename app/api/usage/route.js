import { getSessionFromRequest, isGuestSession, unauthorizedResponse } from "@/lib/auth";
import { clientIpFrom, usageSnapshot } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = getSessionFromRequest(req);
  if (!session) return unauthorizedResponse();

  const ip = clientIpFrom(req.headers);
  const guest = isGuestSession(session);
  const userKey = guest ? `guest-ip:${ip}` : `${session.provider}:${session.sub}`;
  const ipKey = guest ? `guest-ip:${ip}` : ip;

  return Response.json(
    {
      ok: true,
      user: {
        provider: session.provider,
        name: session.name || session.email || session.address || "User",
        email: session.email || "",
        address: session.address || "",
      },
      usage: usageSnapshot({ userKey, ipKey, guest }),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
