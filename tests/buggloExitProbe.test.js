import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* The full-exit simulation. simulateSell() proves tokens can MOVE; simulateExit() proves a sell
   actually CLEARS, by injecting BuggloExitProbe's runtime bytecode into an eth_call and paying the
   Uniswap V3 callback with a real transfer.
 *
 * These tests guard the direction the whole file can fail in: it must never report an exit it did
 * not measure. Every path that could not run has to land on UNKNOWN, and the one that bit during
 * development — a node that quietly ignores `code` overrides, making a call to an empty address
 * return success with no data — has its own test, because that is precisely an absence dressed up
 * as a finding. */

const CHAIN_CALL = vi.hoisted(() => vi.fn());
const GET_MARKET = vi.hoisted(() => vi.fn());

vi.mock("../packages/bugglo/chain.js", () => ({
  chainClient: () => ({ call: CHAIN_CALL }),
  getMarket: GET_MARKET,
}));

const { simulateExit } = await import("../packages/bugglo/simulate.js");
const { EXIT_PROBE_RUNTIME } = await import("../packages/bugglo/simulate.js");

const TOKEN = "0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1";
const POOL = "0x9C49F21aDDa14AF527BC56C2a8fAb854F6248685";
const COUNTER = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";

const word = (hex) => `0x${hex.replace(/^0x/, "").padStart(64, "0")}`;
const addressWord = (a) => word(a.slice(2));

function withMarket() {
  GET_MARKET.mockResolvedValue({ ok: true, hasMarket: true, pairAddress: POOL });
}

/* token0 = COUNTER, token1 = TOKEN, decimals = 18 — the real layout of the pair this was built
   against, so the direction logic is exercised the way production sees it. */
function poolReads() {
  return (args) => {
    const data = String(args.data || "");
    if (args.to === POOL && data.startsWith("0x0dfe1681")) return { data: addressWord(COUNTER) }; // token0()
    if (args.to === POOL && data.startsWith("0xd21220a7")) return { data: addressWord(TOKEN) }; //  token1()
    if (data.startsWith("0x313ce567")) return { data: word("12") }; //                              decimals()
    return null;
  };
}

beforeEach(() => {
  CHAIN_CALL.mockReset();
  GET_MARKET.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("simulateExit", () => {
  it("rejects a malformed address without touching the chain", async () => {
    const result = await simulateExit("not-an-address");
    expect(result.ok).toBe(false);
    expect(CHAIN_CALL).not.toHaveBeenCalled();
  });

  it("is UNKNOWN, never a pass, when there is no pool to sell into", async () => {
    GET_MARKET.mockResolvedValue({ ok: true, hasMarket: false });
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
    expect(result.exits).toBeNull();
    expect(result.note).toMatch(/not a pass/i);
  });

  it("is UNKNOWN when the pool identifier is not a usable address", async () => {
    GET_MARKET.mockResolvedValue({ ok: true, hasMarket: true, pairAddress: `0x${"ab".repeat(32)}` });
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
    expect(result.exits).toBeNull();
  });

  it("is UNKNOWN when the pool does not speak the V3 interface", async () => {
    withMarket();
    CHAIN_CALL.mockRejectedValue(new Error("execution reverted"));
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
    expect(result.note).toMatch(/Uniswap V3 interface/i);
  });

  it("is UNKNOWN when the balance slot cannot be located", async () => {
    withMarket();
    const reads = poolReads();
    CHAIN_CALL.mockImplementation(async (args) => reads(args) ?? { data: word("0") }); // balanceOf never returns MAGIC
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
    expect(result.note).toMatch(/balance storage slot/i);
  });

  /* The bug this guard exists for. A node that ignores `code` state overrides leaves nothing at the
     probe address, and calling an address with no code SUCCEEDS on the EVM and returns empty. Read
     loosely that is a clean result full of zeroes. It must be UNKNOWN. */
  it("refuses to read an empty return as a pass when the probe was never injected", async () => {
    withMarket();
    const reads = poolReads();
    const MAGIC = 123456789012345678901234567890n;
    CHAIN_CALL.mockImplementation(async (args) => {
      const known = reads(args);
      if (known) return known;
      if (args.stateOverride?.some((o) => o.code)) return { data: "0x" }; // probe call, empty return
      return { data: word(MAGIC.toString(16)) }; //                          balanceOf slot probe hit
    });

    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
    expect(result.exits).toBeNull();
    expect(result.note).toMatch(/code\s+state overrides/i);
  });

  it("reports CANNOT-EXIT when the swap reverts", async () => {
    withMarket();
    const reads = poolReads();
    const MAGIC = 123456789012345678901234567890n;
    CHAIN_CALL.mockImplementation(async (args) => {
      const known = reads(args);
      if (known) return known;
      if (args.stateOverride?.some((o) => o.code)) throw new Error("execution reverted");
      return { data: word(MAGIC.toString(16)) };
    });

    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("CANNOT-EXIT");
    expect(result.exits).toBe(false);
    expect(result.evidence.reason).toMatch(/reverted/i);
  });

  it("reports CANNOT-EXIT when the swap clears but returns nothing", async () => {
    withMarket();
    const reads = poolReads();
    const MAGIC = 123456789012345678901234567890n;
    CHAIN_CALL.mockImplementation(async (args) => {
      const known = reads(args);
      if (known) return known;
      if (args.stateOverride?.some((o) => o.code)) return { data: word("0") + word("de0b6b3a7640000").slice(2) };
      return { data: word(MAGIC.toString(16)) };
    });

    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("CANNOT-EXIT");
    expect(result.received).toBe("0");
  });

  it("reports EXIT-CLEARS with the measured amount when a sell actually completes", async () => {
    withMarket();
    const reads = poolReads();
    const MAGIC = 123456789012345678901234567890n;
    const received = 539637195033n;
    const paid = 10n ** 18n;
    CHAIN_CALL.mockImplementation(async (args) => {
      const known = reads(args);
      if (known) return known;
      if (args.stateOverride?.some((o) => o.code)) {
        return { data: word(received.toString(16)) + word(paid.toString(16)).slice(2) };
      }
      return { data: word(MAGIC.toString(16)) };
    });

    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("EXIT-CLEARS");
    expect(result.exits).toBe(true);
    expect(result.received).toBe(received.toString());
    expect(result.evidence.paid).toBe(paid.toString());
    // The claim must stay scoped: never phrased as a guarantee about the reader.
    expect(result.note).toMatch(/not a promise/i);
  });

  it("sells in the correct direction: the token is token1 here, so zeroForOne is false", async () => {
    withMarket();
    const reads = poolReads();
    const MAGIC = 123456789012345678901234567890n;
    let probeArgs = null;
    CHAIN_CALL.mockImplementation(async (args) => {
      const known = reads(args);
      if (known) return known;
      if (args.stateOverride?.some((o) => o.code)) {
        probeArgs = args.data;
        return { data: word("1") + word("1").slice(2) };
      }
      return { data: word(MAGIC.toString(16)) };
    });

    await simulateExit(TOKEN);
    // probeExit(pool, token, zeroForOne, ...) — third argument is the bool, third 32-byte word.
    const third = probeArgs.slice(10 + 128, 10 + 192);
    expect(BigInt(`0x${third}`)).toBe(0n); // false
  });
});

describe("EXIT_PROBE_RUNTIME", () => {
  it("is committed runtime bytecode, not a placeholder", () => {
    expect(EXIT_PROBE_RUNTIME).toMatch(/^0x[0-9a-f]+$/i);
    // 1510 bytes when this was compiled; guard the order of magnitude, not the exact figure,
    // so a recompile with a different solc patch does not fail the suite for no reason.
    const bytes = (EXIT_PROBE_RUNTIME.length - 2) / 2;
    expect(bytes).toBeGreaterThan(500);
    expect(bytes).toBeLessThan(6000);
  });
});
