import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

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
    if (args.to === POOL && data.startsWith("0x3850c7bd")) return { data: word("1") }; //           slot0()  — V3 fingerprint
    if (args.to === POOL && data.startsWith("0x1a686502")) return { data: word("de0b6b3a7640000") }; // liquidity() — non-zero
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

/* The two doors onto simulateExit. Neither test touches the network: the CLI ones assert on help
   and on argument handling that fails before any RPC, and the MCP one reads the server source
   rather than booting a stdio server. What they guard is that the exit simulation is actually
   REACHABLE — a check nobody can run is a check that does not exist. */
describe("simulateExit entry points", () => {
  const cli = "packages/bugglo/cli.js";
  const run = (args) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });

  it("the CLI advertises the exit command and its exit-code contract", () => {
    const result = run(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("bugglo exit <address>");
    // The gating rule is the whole reason it is in the CLI; it must be documented where it is read.
    expect(result.stdout).toMatch(/UNKNOWN both return 1/);
  });

  it("the CLI rejects a malformed address for exit without reporting a pass", () => {
    const result = run(["exit", "not-an-address"]);
    expect(result.status).not.toBe(0);
    /* Not asserting on the string "EXIT-CLEARS": the help text names it while documenting the
       exit-code contract, so a malformed address that prints usage contains it legitimately.
       What must never appear is the sentence that reports a measured, successful exit. */
    expect(result.stdout + result.stderr).not.toMatch(/completed a full sell/);
  });

  it("the MCP server exposes bugglo_simulate_exit and imports it", () => {
    const source = readFileSync("packages/bugglo-mcp/server.js", "utf8");
    expect(source).toContain('"bugglo_simulate_exit"');
    expect(source).toMatch(/import \{[^}]*simulateExit[^}]*\} from "bugglo\/simulate"/);
    // The description has to carry the UNKNOWN rule, because for an agent the description IS the docs.
    expect(source).toMatch(/UNKNOWN is\s+"?\s*\+?\s*"?never PASS/);
  });


  it("the web agent registers robinhood_exit_check as a first-party in-process tool", () => {
    const source = readFileSync("lib/liveAgent.js", "utf8");
    expect(source).toContain('name: "robinhood_exit_check"');
    expect(source).toMatch(/import\("bugglo\/simulate"\)/);
    /* First-party means in-process: it must NOT be reached through the MCP fleet, which is the
       fleet that answered about the wrong chain and started this whole project. */
    const block = source.slice(source.indexOf("const FIRST_PARTY_TOOLS"), source.indexOf("function truncate"));
    expect(block).toContain("robinhood_exit_check");
    expect(block).toContain("robinhood_rug_check");
  });

  it("the system prompt stops listing sellability as unmeasurable and points at the tool", () => {
    const source = readFileSync("lib/systemPrompt.js", "utf8");
    expect(source).toContain("robinhood_exit_check");
    // The old text promised the model that a live sell simulation was simply not covered.
    expect(source).not.toMatch(/LP-lock status and a live sell simulation are \*not covered\*/);
    // Every branch of the new result has to carry its reading rule.
    expect(source).toContain("EXIT-CLEARS");
    expect(source).toContain("CANNOT-EXIT");
  });

  it("ships the probe source so the injected bytecode can be audited, not trusted", () => {
    const manifest = JSON.parse(readFileSync("packages/bugglo/package.json", "utf8"));
    expect(manifest.files).toContain("BuggloExitProbe.sol");
    expect(existsSync("packages/bugglo/BuggloExitProbe.sol")).toBe(true);
  });
});

/* Audit findings, pinned. Both came from decimals(), which the token's deployer chooses and which
   this file turns into an exponent. Neither was a honeypot; both made an honest token look like
   one, which on this product is the worst class of bug there is. */
describe("simulateExit — attacker-controlled decimals", () => {
  const withDecimals = (decHex) => {
    withMarket();
    const reads = poolReads();
    const MAGIC = 123456789012345678901234567890n;
    CHAIN_CALL.mockImplementation(async (args) => {
      const data = String(args.data || "");
      if (args.to === POOL && data.startsWith("0x0dfe1681")) return { data: addressWord(COUNTER) };
      if (args.to === POOL && data.startsWith("0xd21220a7")) return { data: addressWord(TOKEN) };
      if (data.startsWith("0x313ce567")) return { data: word(decHex) };
      if (args.stateOverride?.some((o) => o.code)) return { data: word("1") + word("1").slice(2) };
      return { data: word(MAGIC.toString(16)) };
    });
    void reads;
  };

  /* 78 decimals puts 10**decimals past uint256, viem refuses to encode it, and the throw used to
     land in the catch that reports CANNOT-EXIT. A token earned the harshest verdict this tool has
     by declaring a number. */
  it("does not accuse a token of being untradeable because it declared absurd decimals", async () => {
    for (const decHex of ["4e", "ff"]) {
      withDecimals(decHex);
      const result = await simulateExit(TOKEN);
      expect(result.status).toBe("UNKNOWN");
      expect(result.status).not.toBe("CANNOT-EXIT");
      expect(result.note).toMatch(/not a finding against the token/i);
    }
  });

  /* 77 encodes but passes int256.max, and Solidity's int256(uint256) cast is unchecked: it wraps
     negative, and V3 reads a negative amountSpecified as exact-OUTPUT. The probe would have
     answered a different question and looked like it worked. */
  it("refuses a size that would wrap the int256 cast into an exact-output swap", async () => {
    withDecimals("4d"); // 77
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
  });

  it("still runs normally for real-world decimals", async () => {
    for (const decHex of ["06", "08", "12"]) { // 6, 8, 18
      withDecimals(decHex);
      const result = await simulateExit(TOKEN);
      expect(result.status).toBe("EXIT-CLEARS");
    }
  });
});

describe("BuggloExitProbe.sol", () => {
  const source = readFileSync("packages/bugglo/BuggloExitProbe.sol", "utf8");

  it("bounds amountIn below int256.max so the unchecked cast cannot flip the swap direction", () => {
    expect(source).toMatch(/require\(amountIn <= uint256\(type\(int256\)\.max\)/);
  });

  it("cannot be re-entered by the hostile token it is measuring", () => {
    expect(source).toMatch(/require\(!probing/);
    expect(source).toMatch(/probing = true/);
    expect(source).toMatch(/probing = false/);
  });

  it("only accepts the callback from the pool it is currently probing", () => {
    expect(source).toMatch(/require\(msg\.sender == activePool/);
  });
});

/* Two more audit findings, both measured on live chain-4663 pools. Neither token was a honeypot;
   both were being reported as CANNOT-EXIT, which the system prompt tells the agent to lead with
   and to rank above every green line in a rug check. */
describe("simulateExit — pools it cannot drive must not become accusations", () => {
  const MAGIC = 123456789012345678901234567890n;

  const poolWhere = (overrides) => {
    withMarket();
    CHAIN_CALL.mockImplementation(async (args) => {
      const data = String(args.data || "");
      if (args.to === POOL && data.startsWith("0x0dfe1681")) return { data: addressWord(COUNTER) };
      if (args.to === POOL && data.startsWith("0xd21220a7")) return { data: addressWord(TOKEN) };
      if (args.to === POOL && data.startsWith("0x3850c7bd")) return overrides.slot0();
      if (args.to === POOL && data.startsWith("0x1a686502")) return overrides.liquidity();
      if (data.startsWith("0x313ce567")) return { data: word("12") };
      if (args.stateOverride?.some((o) => o.code)) return { data: word("1") + word("1").slice(2) };
      return { data: word(MAGIC.toString(16)) };
    });
  };

  /* token0()/token1() answer on plenty of non-V3 pools. Driving one with V3's swap() signature
     just reverts, and that revert was being read as "you cannot sell". Two pools DexScreener
     labels "uniswap" on chain 4663 behave exactly this way. */
  it("is UNKNOWN, not CANNOT-EXIT, when the pool is pair-shaped but not V3", async () => {
    poolWhere({
      slot0: () => { throw new Error("execution reverted"); },
      liquidity: () => { throw new Error("execution reverted"); },
    });
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
    expect(result.note).toMatch(/not a finding against the token/i);
  });

  /* A V3 pool with no liquidity in range swaps nothing, so the callback is owed nothing and the
     probe's own require(owed > 0) reverts. "Nothing to sell into right now" is a fact about the
     pool's tick, not evidence the token traps sellers. */
  it("is UNKNOWN, not CANNOT-EXIT, when the pool has zero active liquidity", async () => {
    poolWhere({ slot0: () => ({ data: word("1") }), liquidity: () => ({ data: word("0") }) });
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("UNKNOWN");
    expect(result.note).toMatch(/no active liquidity/i);
  });

  it("still clears a healthy V3 pool with liquidity in range", async () => {
    poolWhere({ slot0: () => ({ data: word("1") }), liquidity: () => ({ data: word("de0b6b3a7640000") }) });
    const result = await simulateExit(TOKEN);
    expect(result.status).toBe("EXIT-CLEARS");
  });
});
