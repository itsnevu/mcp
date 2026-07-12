import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { GET as sessionGET } from "@/app/api/auth/session/route";
import { POST as noncePOST } from "@/app/api/auth/wallet/nonce/route";
import { POST as verifyPOST } from "@/app/api/auth/wallet/verify/route";
import { AUTH_COOKIE, createSignedToken, parseCookies, verifySignedToken } from "@/lib/auth";

describe("auth", () => {
  it("round-trips signed session tokens", () => {
    const token = createSignedToken({ sub: "google:123", provider: "google", email: "a@b.test" });
    expect(verifySignedToken(token)).toMatchObject({ sub: "google:123", provider: "google" });
    expect(verifySignedToken(`${token}x`)).toBe(null);
  });

  it("reads authenticated sessions from cookies", async () => {
    const token = createSignedToken({ sub: "wallet:0xabc", provider: "wallet", address: "0xabc" });
    const res = await sessionGET(new Request("http://localhost/api/auth/session", { headers: { cookie: `${AUTH_COOKIE}=${token}` } }));
    await expect(res.json()).resolves.toMatchObject({ authenticated: true, user: { provider: "wallet" } });
  });

  it("verifies wallet nonce and signature", async () => {
    const account = privateKeyToAccount("0x".padEnd(66, "1"));
    const nonceRes = await noncePOST(
      new Request("http://localhost/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ address: account.address }),
      })
    );
    const nonceData = await nonceRes.json();
    const nonceCookie = nonceRes.headers.get("set-cookie");
    const signature = await account.signMessage({ message: nonceData.message });

    const verifyRes = await verifyPOST(
      new Request("http://localhost/api/auth/wallet/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
          cookie: nonceCookie,
        },
        body: JSON.stringify({ address: account.address, message: nonceData.message, signature }),
      })
    );
    const cookie = parseCookies(verifyRes.headers.get("set-cookie"));

    expect(verifyRes.status).toBe(200);
    await expect(verifyRes.json()).resolves.toMatchObject({ ok: true, user: { provider: "wallet", address: account.address } });
    expect(verifySignedToken(cookie[AUTH_COOKIE])).toMatchObject({ provider: "wallet", address: account.address });
  });
});
