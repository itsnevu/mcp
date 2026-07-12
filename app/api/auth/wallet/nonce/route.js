import { isValidEvmAddress, randomNonce, walletLoginMessage, walletNonceCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  if (!isValidEvmAddress(address)) {
    return Response.json({ error: "valid EVM wallet address is required" }, { status: 400 });
  }

  const nonce = randomNonce();
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const message = walletLoginMessage({ address, nonce, origin });
  const headers = new Headers();
  headers.append("set-cookie", walletNonceCookie({ address, nonce }));

  return Response.json({ message, expiresIn: 300 }, { headers });
}
