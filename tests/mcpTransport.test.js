import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { connectorsFor } from "@/lib/liveAgent";

/* connectorsFor returns [label, connect] pairs in the order they should be attempted, so a
   test can assert the routing without opening a socket. The bug this guards against is
   silent by construction: pick the wrong transport and the server just logs "unavailable"
   and disappears from the fleet, while every page still claims it is loaded. */
const labels = (config) => connectorsFor(config).map(([label]) => label);

describe("connectorsFor", () => {
  it("routes a stdio server by command", () => {
    expect(labels({ command: "npx", args: ["-y", "some-mcp"] })).toEqual(["stdio"]);
  });

  it("honours an explicit streamable-http declaration and does not fall back", () => {
    // blockscout declares this. It answers an SSE handshake with 405.
    expect(labels({ url: "https://example.com/mcp", transport: "streamable-http" })).toEqual([
      "streamable-http",
    ]);
  });

  it('treats "type": "http" as streamable HTTP', () => {
    // How the boar servers declare themselves.
    expect(labels({ url: "https://example.com/mcp", type: "http" })).toEqual(["streamable-http"]);
  });

  it("honours an explicit sse declaration", () => {
    expect(labels({ url: "https://example.com/sse", transport: "sse" })).toEqual(["sse"]);
  });

  it("probes streamable HTTP first, then SSE, when a server declares nothing", () => {
    // SSE is the deprecated transport, so the modern one is tried first.
    expect(labels({ url: "https://example.com/mcp" })).toEqual(["streamable-http", "sse"]);
  });

  it("is case-insensitive about the declaration", () => {
    expect(labels({ url: "https://example.com/mcp", transport: "Streamable-HTTP" })).toEqual([
      "streamable-http",
    ]);
  });

  it("yields nothing for a server with neither command nor url", () => {
    expect(connectorsFor({ disabled: true })).toEqual([]);
  });
});

describe("mcp.json", () => {
  const config = JSON.parse(readFileSync(path.join(process.cwd(), "mcp.json"), "utf8"));
  const servers = Object.entries(config.mcpServers).filter(([, s]) => !s.disabled);

  it("has every enabled server resolve to at least one transport", () => {
    // A server that resolves to no connector is one this app can never load, no matter what
    // the docs say about it.
    const stranded = servers.filter(([, s]) => connectorsFor(s).length === 0).map(([name]) => name);
    expect(stranded).toEqual([]);
  });

  it("declares only transports the client understands", () => {
    const known = ["", "http", "streamable-http", "streamablehttp", "sse"];
    const unknown = servers
      .map(([name, s]) => [name, String(s.transport || s.type || "").toLowerCase()])
      .filter(([, declared]) => !known.includes(declared));
    expect(unknown).toEqual([]);
  });

  it("never hands a stdio server the whole environment", () => {
    // envFrom is an allowlist of variable names; a literal `env` block is fine. What must not
    // appear is a secret being passed through by hand.
    const leaky = servers
      .filter(([, s]) => s.command)
      .filter(([, s]) =>
        Object.values(s.env || {}).some((value) => /^(sk-|0x[0-9a-f]{40,})/i.test(String(value)))
      )
      .map(([name]) => name);
    expect(leaky).toEqual([]);
  });
});
