import { verifyMessage } from "viem";
import {
  WALLET_NONCE_COOKIE,
  clearCookie,
  getWalletNonceFromRequest,
  isValidEvmAddress,
  sessionCookie,
  walletLoginMessage,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const signature = typeof body?.signature === "string" ? body.signature.trim() : "";
  const message = typeof body?.message === "string" ? body.message : "";
  const nonceState = getWalletNonceFromRequest(req);

  if (!isValidEvmAddress(address) || !signature || !nonceState) {
    return Response.json({ error: "wallet login challenge is invalid or expired" }, { status: 400 });
  }
  if (nonceState.address !== address.toLowerCase()) {
    return Response.json({ error: "wallet address does not match challenge" }, { status: 400 });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const expectedMessage = walletLoginMessage({ address, nonce: nonceState.nonce, origin });
  if (message !== expectedMessage) {
    return Response.json({ error: "wallet login message does not match challenge" }, { status: 400 });
  }

  const valid = await verifyMessage({ address, message, signature }).catch(() => false);
  if (!valid) {
    return Response.json({ error: "wallet signature verification failed" }, { status: 401 });
  }

  const headers = new Headers();
  headers.append("set-cookie", sessionCookie({ sub: `wallet:${address.toLowerCase()}`, provider: "wallet", address }));
  headers.append("set-cookie", clearCookie(WALLET_NONCE_COOKIE));
  return Response.json({ ok: true, user: { provider: "wallet", address } }, { headers });
}
