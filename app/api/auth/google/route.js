import { createRemoteJWKSet, jwtVerify } from "jose";
import { sessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const credential = typeof body?.credential === "string" ? body.credential : "";
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return Response.json({ error: "GOOGLE_CLIENT_ID is not configured" }, { status: 503 });
  }
  if (!credential) {
    return Response.json({ error: "Google credential is required" }, { status: 400 });
  }

  try {
    const { payload } = await jwtVerify(credential, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    if (!payload.sub || !payload.email) {
      return Response.json({ error: "Google credential is missing required identity fields" }, { status: 400 });
    }

    const user = {
      sub: `google:${payload.sub}`,
      provider: "google",
      name: String(payload.name || payload.email),
      email: String(payload.email),
      picture: String(payload.picture || ""),
    };
    const headers = new Headers();
    headers.append("set-cookie", sessionCookie(user));
    return Response.json({ ok: true, user }, { headers });
  } catch {
    return Response.json({ error: "Google credential verification failed" }, { status: 401 });
  }
}
