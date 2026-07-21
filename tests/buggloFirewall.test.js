import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* Bugglo Firewall — the pre-trade gate. These tests guard the ONE property that makes a firewall a
   firewall: it fails CLOSED. An ALLOW must be earned (a sell was actually proven), a proven danger
   must BLOCK, and anything unproven must be UNKNOWN — never a silent ALLOW. Same rule as the rest of
   Bugglo: UNKNOWN is not PASS. */

import { verifyAgainstRegistry, officialAddressFor, officialList } from "../packages/bugglo/registry.js";

const AAPL_OFFICIAL = officialAddressFor("AAPL");
const NOT_OFFICIAL = "0x1111111111111111111111111111111111111111";

describe("RWA registry", () => {
  it("marks a pinned issuer address OFFICIAL", () => {
    const r = verifyAgainstRegistry(AAPL_OFFICIAL, { symbol: "AAPL" });
    expect(r.status).toBe("OFFICIAL");
    expect(r.matched.ticker).toBe("AAPL");
  });

  it("flags a ticker collision at a different address as IMPOSTOR-SUSPECT", () => {
    const r = verifyAgainstRegistry(NOT_OFFICIAL, { symbol: "AAPL", name: "Apple" });
    expect(r.status).toBe("IMPOSTOR-SUSPECT");
    expect(r.matched.officialAddress.toLowerCase()).toBe(AAPL_OFFICIAL.toLowerCase());
  });

  it("does NOT accuse an unrelated token — absence from a partial registry is not a red flag", () => {
    const r = verifyAgainstRegistry(NOT_OFFICIAL, { symbol: "PEPE", name: "Pepe" });
    expect(r.status).toBe("NOT-IN-REGISTRY");
  });

  it("catches a name collision even when the symbol differs", () => {
    const r = verifyAgainstRegistry(NOT_OFFICIAL, { symbol: "APLX", name: "Apple" });
    expect(r.status).toBe("IMPOSTOR-SUSPECT");
  });

  it("every pinned entry is a checksummed 20-byte address", () => {
    for (const t of officialList()) {
      expect(t.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});

/* The gate composes rugCheck + simulateSell + registry. We mock those three so the decision logic is
   tested in isolation, deterministically, with no network. */
function mockModules({ rug, sell }) {
  vi.doMock("../packages/bugglo/chain.js", () => ({
    rugCheck: vi.fn(async () => rug),
  }));
  vi.doMock("../packages/bugglo/simulate.js", () => ({
    simulateSell: vi.fn(async () => sell),
  }));
}

async function runGate(address, opts) {
  vi.resetModules();
  const { tradeGate } = await import("../packages/bugglo/gate.js");
  return tradeGate(address, opts);
}

const REAL = "0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1";

const cleanRug = {
  ok: true,
  address: REAL,
  chainId: 4663,
  verdict: "NO RED FLAGS IN WHAT I COULD CHECK",
  token: { name: "Robin Hood", symbol: "FOX", decimals: 18 },
  signals: [{ key: "is-contract", status: "PASS", label: "Contract exists", detail: "4,830 bytes" }],
  unmeasured: [],
};
const sellPass = { ok: true, status: "SELLABLE-SO-FAR", transferable: true, destination: REAL, note: "moved" };
const sellUnknown = { ok: true, status: "UNKNOWN", transferable: null, destination: null, note: "no pool" };
const sellBlocked = { ok: true, status: "CANNOT-MOVE", transferable: false, destination: REAL, note: "reverts" };

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("tradeGate decision", () => {
  it("ALLOWs only when a sell was actually proven", async () => {
    mockModules({ rug: cleanRug, sell: sellPass });
    const g = await runGate(REAL, { side: "buy" });
    expect(g.decision).toBe("ALLOW");
  });

  it("fails CLOSED to UNKNOWN when the sell could not be proven (clean rug is not enough)", async () => {
    mockModules({ rug: cleanRug, sell: sellUnknown });
    const g = await runGate(REAL, { side: "buy" });
    expect(g.decision).toBe("UNKNOWN");
  });

  it("BLOCKs when the sell simulation proves the token cannot be moved", async () => {
    mockModules({ rug: cleanRug, sell: sellBlocked });
    const g = await runGate(REAL, { side: "buy" });
    expect(g.decision).toBe("BLOCK");
    expect(g.reasons[0].severity).toBe("BLOCK");
  });

  it("BLOCKs a NOT A CONTRACT address regardless of the sell sim", async () => {
    mockModules({ rug: { ...cleanRug, verdict: "NOT A CONTRACT", signals: [] }, sell: sellUnknown });
    const g = await runGate(REAL, { side: "buy" });
    expect(g.decision).toBe("BLOCK");
  });

  it("BLOCKs an RWA impostor even with a clean rug and a passing sell", async () => {
    const impostorRug = { ...cleanRug, address: NOT_OFFICIAL, token: { symbol: "AAPL", name: "Apple", decimals: 18 } };
    mockModules({ rug: impostorRug, sell: { ...sellPass, destination: NOT_OFFICIAL } });
    const g = await runGate(NOT_OFFICIAL, { side: "buy" });
    expect(g.decision).toBe("BLOCK");
    expect(g.reasons.some((r) => r.code === "rwa:impostor")).toBe(true);
  });

  it("a FAIL rug signal forces BLOCK", async () => {
    const failRug = { ...cleanRug, verdict: "HIGH RISK", signals: [{ key: "x", status: "FAIL", label: "bad", detail: "d" }] };
    mockModules({ rug: failRug, sell: sellPass });
    const g = await runGate(REAL, { side: "buy" });
    expect(g.decision).toBe("BLOCK");
  });

  it("orders reasons worst-first (BLOCK before WARN before UNKNOWN)", async () => {
    const mixedRug = {
      ...cleanRug,
      verdict: "HIGH RISK",
      signals: [
        { key: "u", status: "UNKNOWN", label: "unclear", detail: "d" },
        { key: "w", status: "WARN", label: "warn", detail: "d" },
        { key: "f", status: "FAIL", label: "fail", detail: "d" },
      ],
    };
    mockModules({ rug: mixedRug, sell: sellPass });
    const g = await runGate(REAL, { side: "buy" });
    const severities = g.reasons.map((r) => r.severity);
    const firstWarn = severities.indexOf("WARN");
    const firstUnknown = severities.indexOf("UNKNOWN");
    expect(severities[0]).toBe("BLOCK");
    if (firstWarn !== -1 && firstUnknown !== -1) expect(firstWarn).toBeLessThan(firstUnknown);
  });

  it("respects requireSellProof=false: ALLOWs a clean token without a sell proof", async () => {
    mockModules({ rug: cleanRug, sell: sellUnknown });
    const g = await runGate(REAL, { side: "buy", policy: { requireSellProof: false } });
    expect(g.decision).toBe("ALLOW");
  });
});
