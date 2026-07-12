import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import { AUTH_COOKIE, createSignedToken } from "@/lib/auth";

function sessionCookie() {
  return `${AUTH_COOKIE}=${createSignedToken({ sub: "test:user", provider: "google", email: "test@example.com" })}`;
}

function request(body, { authenticated = true } = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `test-${Math.random()}`,
      ...(authenticated ? { cookie: sessionCookie() } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  it("returns a demo response when live credentials are not configured", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const res = await POST(request({ message: "What can you do?", mode: "Auto", history: [] }));
    const data = await res.json();

    if (original === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = original;
    }
    expect(res.status).toBe(200);
    expect(data.source).toBe("demo");
    expect(data.backend).toBe("demo");
    expect(data.reply).toMatchObject({ kind: "text" });
  });

  it("requires an authenticated session", async () => {
    const res = await POST(request({ message: "What can you do?", mode: "Auto", history: [] }, { authenticated: false }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "authentication required" });
  });

  it("rejects invalid json and missing messages", async () => {
    const badJson = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `bad-${Math.random()}`,
          cookie: sessionCookie(),
        },
        body: "{",
      })
    );
    expect(badJson.status).toBe(400);

    const missing = await POST(request({ mode: "Auto" }));
    expect(missing.status).toBe(400);
  });
});
