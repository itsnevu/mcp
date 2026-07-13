import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import { AUTH_COOKIE, createSignedToken } from "@/lib/auth";

const ENGINE_VARS = ["ROBINX_ENGINE_KEY", "ROBINX_ENGINE_URL", "ROBINX_ENGINE_MODEL"];

/* Live mode needs all three. Clearing them keeps these tests off the network and proves the
   route refuses to invent an answer when the engine is not configured. */
function withoutLiveEngine(run) {
  const saved = Object.fromEntries(ENGINE_VARS.map((name) => [name, process.env[name]]));
  for (const name of ENGINE_VARS) delete process.env[name];
  return Promise.resolve(run()).finally(() => {
    for (const name of ENGINE_VARS) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });
}

function sessionCookie() {
  return `${AUTH_COOKIE}=${createSignedToken({ sub: "test:user", provider: "google", email: "test@example.com" })}`;
}

function request(body, { authenticated = true, ip } = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip || `test-${Math.random()}`,
      ...(authenticated ? { cookie: sessionCookie() } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  it("returns unavailable when live credentials are not configured", async () => {
    await withoutLiveEngine(async () => {
      const res = await POST(request({ message: "What can you do?", mode: "Auto", history: [] }));
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.unavailable).toBe(true);
      expect(data.reply).toBeUndefined();
    });
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

  it("answers a flood with 429 server-busy and never names the limit that fired", { timeout: 20_000 }, async () => {
    await withoutLiveEngine(async () => {
      const ip = `flood-${Math.random()}`;
      let busy = null;

      for (let i = 0; i < 40 && !busy; i += 1) {
        const res = await POST(request({ message: "hi", mode: "Fast", history: [] }, { ip }));
        if (res.status === 429) busy = res;
      }

      expect(busy, "the per-IP flood brake never fired").not.toBeNull();
      expect(busy.headers.get("retry-after")).toBeTruthy();

      const data = await busy.json();
      expect(data.busy).toBe(true);
      expect(data.retryAfterMs).toBeGreaterThan(0);
      expect(data.error).toMatch(/busy/i);
      // The reason a request was refused is an internal detail; leaking it hands an
      // attacker a map of exactly which cap to work around.
      expect(JSON.stringify(data)).not.toMatch(/rate|spend|budget|concurren|limit/i);
    });
  });
});
