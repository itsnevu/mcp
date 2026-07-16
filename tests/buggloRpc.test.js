import http from "node:http";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/* The censorship-resistant RPC layer (packages/bugglo/rpc.js) is what lets bugglo work from
   networks that DNS-block the robinhood.com domain — most importantly Indonesia's Trust Positif
   filter, where the tool was otherwise dead on arrival. These tests lock in its two load-bearing
   properties:
     1. The DoH bypass fires on a CONNECTION failure and reaches the endpoint by IP.
     2. A valid JSON-RPC error (a revert, a rate limit) is an ANSWER, not a block — it is returned
        as-is and must never be mistaken for a reason to re-route. Getting this wrong would turn
        every revert into a wasted second connection, and worse, could mask a real chain answer. */

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function jsonRpc(handler) {
  return (req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(handler(JSON.parse(body), req)));
    });
  };
}

async function freshRpc() {
  vi.resetModules(); // rpc.js caches DoH results and pinned IPs at module scope — start each test clean
  return import("../packages/bugglo/rpc.js");
}

let realFetch;
beforeEach(() => {
  realFetch = global.fetch;
});
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("bugglo rpc layer", () => {
  it("uses the direct path and never touches DoH when the host is reachable", async () => {
    const { server, port } = await startServer(jsonRpc(() => ({ jsonrpc: "2.0", id: 1, result: "0x1237" })));
    global.fetch = vi.fn(); // a DoH lookup here would be a bug

    try {
      const { rpcRequest, isPinned } = await freshRpc();
      const result = await rpcRequest(`http://127.0.0.1:${port}/`, "eth_chainId", []);
      expect(result).toBe("0x1237");
      expect(global.fetch).not.toHaveBeenCalled();
      expect(isPinned("127.0.0.1")).toBe(false); // nothing was blocked, so nothing is pinned
    } finally {
      server.close();
    }
  });

  it("returns a JSON-RPC error as an error, without falling back to DoH", async () => {
    const { server, port } = await startServer(
      jsonRpc(() => ({ jsonrpc: "2.0", id: 1, error: { code: -32000, message: "execution reverted" } }))
    );
    global.fetch = vi.fn(); // a valid error response is an answer, not a block — DoH must stay untouched

    try {
      const { rpcRequest } = await freshRpc();
      await expect(rpcRequest(`http://127.0.0.1:${port}/`, "eth_call", [])).rejects.toThrow(/execution reverted/);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("routes around a DNS block: connect fails, DoH resolves the real IP, and the host is pinned", async () => {
    const { server, port } = await startServer(jsonRpc(() => ({ jsonrpc: "2.0", id: 1, result: "0x1237" })));
    // Stand in for the blocked host's real address. blocked.invalid never resolves, so the direct
    // connection fails exactly like a poisoned lookup would; DoH then hands back a reachable IP.
    global.fetch = vi.fn(async (url) => {
      expect(String(url)).toMatch(/dns-query|resolve/);
      return { ok: true, json: async () => ({ Answer: [{ type: 1, data: "127.0.0.1" }] }) };
    });

    try {
      const { rpcRequest, isPinned } = await freshRpc();
      const result = await rpcRequest(`http://blocked.invalid:${port}/`, "eth_chainId", []);
      expect(result).toBe("0x1237");
      expect(global.fetch).toHaveBeenCalled();
      expect(isPinned("blocked.invalid")).toBe(true);
    } finally {
      server.close();
    }
  });

  it("fails honestly when the host is blocked AND DoH cannot resolve it", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ Answer: [] }) }));

    const { rpcRequest, isPinned } = await freshRpc();
    await expect(rpcRequest("http://blocked.invalid:1/", "eth_chainId", [])).rejects.toBeTruthy();
    expect(isPinned("blocked.invalid")).toBe(false); // nothing proven, nothing pinned
  });

  it("surfaces a non-JSON / captive-portal body as an error, without falling back to DoH", async () => {
    const { server, port } = await startServer((req, res) => {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html");
      res.end("<html>blocked by your provider</html>"); // a 200 that is not JSON-RPC is still an answer, not a block
    });
    global.fetch = vi.fn();

    try {
      const { rpcRequest } = await freshRpc();
      await expect(rpcRequest(`http://127.0.0.1:${port}/`, "eth_chainId", [])).rejects.toThrow(/non-JSON/);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("is bounded by a hard deadline when a server accepts the socket but never responds", async () => {
    const { server, port } = await startServer(() => {
      /* accept the connection and hang — never write a response */
    });
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ Answer: [] }) }));

    try {
      const { rpcRequest } = await freshRpc();
      // A socket-inactivity timeout would never fire here (the connection is healthy, just silent);
      // the hard deadline must. If it did not, this would hang until vitest kills the test.
      await expect(
        rpcRequest(`http://127.0.0.1:${port}/`, "eth_chainId", [], { timeout: 500 })
      ).rejects.toThrow(/timed out/);
    } finally {
      server.close();
    }
  });

  it("reports no pin for a host it has never seen", async () => {
    const { isPinned } = await freshRpc();
    expect(isPinned("never-seen.example")).toBe(false);
  });
});
