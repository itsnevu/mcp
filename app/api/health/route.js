import { SERVICE_NAME } from "@/lib/chatContract";
import { liveBackendConfigured, liveBackendHealth } from "@/lib/liveAgent";

export const runtime = "nodejs";

export async function GET() {
  const capabilities = await liveBackendHealth();
  return Response.json({
    ok: true,
    service: SERVICE_NAME,
    mode: liveBackendConfigured() ? "live-ready" : "demo",
    capabilities,
  });
}
