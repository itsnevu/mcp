import { AUTH_COOKIE, WALLET_NONCE_COOKIE, clearCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const headers = new Headers();
  headers.append("set-cookie", clearCookie(AUTH_COOKIE));
  headers.append("set-cookie", clearCookie(WALLET_NONCE_COOKIE));
  return Response.json({ ok: true }, { headers });
}
