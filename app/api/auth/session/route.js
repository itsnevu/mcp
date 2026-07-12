import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getSessionFromRequest(req);
  return Response.json({ authenticated: Boolean(user), user });
}
