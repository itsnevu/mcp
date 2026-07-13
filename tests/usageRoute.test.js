import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/usage/route";
import { AUTH_COOKIE, createSignedToken } from "@/lib/auth";

function req(authenticated = true) {
  return new Request("http://localhost/api/usage", {
    headers: {
      "x-forwarded-for": "203.0.113.10",
      ...(authenticated
        ? {
            cookie: `${AUTH_COOKIE}=${createSignedToken({
              sub: "usage:test",
              provider: "google",
              email: "usage@example.com",
            })}`,
          }
        : {}),
    },
  });
}

describe("GET /api/usage", () => {
  it("requires a session", async () => {
    expect((await GET(req(false))).status).toBe(401);
  });

  it("returns a no-store scoped usage payload", async () => {
    const res = await GET(req());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe("usage@example.com");
    expect(data.usage.user).toMatchObject({ requestsToday: expect.any(Number), capUsdToday: expect.any(Number) });
  });
});
