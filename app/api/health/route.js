import { SERVICE_NAME } from "@/lib/chatContract";
import { liveBackendConfigured, liveBackendHealth } from "@/lib/liveAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health        → cheap. Reports what it knows without booting anything.
 * GET /api/health?probe=1 → boots the MCP fleet if it is cold, then reports the real result.
 *
 * This endpoint used to answer `mode: "live-ready"` whenever three env vars were set, and
 * `mcp: Boolean(mcpState)` — a lazy cache that only a chat turn fills in. So during the outage
 * that prompted all this, it reported live-ready/mcp:false, which reads as "fine, just idle",
 * while every single user was being served invented data. It was green through the whole thing.
 *
 * "live-ready" now means the engine is configured. It has never meant more than that, and it
 * should not pretend to: the only way to know the tools work is to start them, which is what
 * ?probe=1 does. Point uptime monitoring at ?probe=1, and alert on mcp !== "up".
 */
export async function GET(req) {
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const capabilities = await liveBackendHealth({ probe });

  const configured = liveBackendConfigured();
  const misconfigured = !configured;

  const degraded = configured && capabilities.mcp === "down";

  return Response.json(
    {
      ok: !misconfigured,
      service: SERVICE_NAME,
      mode: misconfigured ? "misconfigured" : "live-ready",
      degraded,
      capabilities,
      observedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    },
    { status: misconfigured ? 503 : 200, headers: { "Cache-Control": "no-store" } }
  );
}
