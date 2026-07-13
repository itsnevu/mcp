import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* These tests exist to stop ONE regression, and it is the one that started all of this:
   a check that could not run being presented as a check that passed.
   Older builds emitted precise lock and holder claims nobody had measured to people deciding
   whether to buy a token. Everything below is a guard against that class of answer ever being
   emitted again by a different route. */

const FOX = "0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1";

const mockClient = {
  getCode: vi.fn(),
  readContract: vi.fn(),
  getStorageAt: vi.fn(),
};

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, createPublicClient: () => mockClient };
});

async function loadRugCheck() {
  vi.resetModules();
  const mod = await import("../lib/chainData.js");
  return mod;
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => [] }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rugCheck", () => {
  it("refuses to reach a verdict when the chain is unreachable", async () => {
    const { rugCheck } = await loadRugCheck();
    mockClient.getCode.mockRejectedValue(new Error("HTTP request failed"));

    const result = await rugCheck(FOX);

    /* The whole bug in one assertion. An unreachable chain must NOT become a risk rating —
       and it must not become "no red flags found" either, which is what silence looks like
       to a model that was handed an empty result. */
    expect(result.verdict).toBe("CANNOT CHECK");
    expect(result.signals).toHaveLength(0);
    expect(result.summary).toMatch(/will not guess/i);
  });

  it("never reports UNKNOWN ownership as renounced or as a pass", async () => {
    const { rugCheck } = await loadRugCheck();
    mockClient.getCode.mockResolvedValue("0x60806040" + "ab".repeat(200));
    mockClient.getStorageAt.mockResolvedValue("0x0");
    mockClient.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "owner") throw new Error("execution reverted");
      if (functionName === "symbol") return "FOX";
      if (functionName === "name") return "Robin Hood";
      if (functionName === "decimals") return 18;
      if (functionName === "totalSupply") return 10n ** 27n;
      throw new Error("unexpected call");
    });

    const result = await rugCheck(FOX);
    const ownership = result.signals.find((s) => s.key === "ownership");

    /* A contract with no owner() is NOT a renounced contract — it may use AccessControl or a
       embedded admin we cannot see. Calling that "PASS: ownership renounced" would hand the
       user a safety guarantee that was never established. */
    expect(ownership.status).toBe("UNKNOWN");
    expect(ownership.status).not.toBe("PASS");
    expect(ownership.detail).toMatch(/does NOT mean ownership is renounced/i);
  });

  it("always discloses what it could not measure, even on a clean result", async () => {
    const { rugCheck } = await loadRugCheck();
    mockClient.getCode.mockResolvedValue("0x60806040" + "ab".repeat(200));
    mockClient.getStorageAt.mockResolvedValue("0x0");
    mockClient.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "owner") return "0x0000000000000000000000000000000000000000";
      if (functionName === "symbol") return "FOX";
      if (functionName === "name") return "Robin Hood";
      if (functionName === "decimals") return 18;
      if (functionName === "totalSupply") return 10n ** 27n;
      throw new Error("unexpected call");
    });

    const result = await rugCheck(FOX);
    const keys = result.unmeasured.map((u) => u.key);

    /* Shipped on EVERY result, including the cleanest one. A summary that omits these reads as
       "and those were fine too", which is precisely the lie we are preventing. */
    expect(keys).toContain("holderConcentration");
    expect(keys).toContain("liquidityLock");
    expect(keys).toContain("honeypotSimulation");
  });

  it("calls an EOA an EOA rather than inventing a token for it", async () => {
    const { rugCheck } = await loadRugCheck();
    mockClient.getCode.mockResolvedValue("0x");

    const result = await rugCheck(FOX);

    expect(result.verdict).toBe("NOT A CONTRACT");
    expect(result.signals).toHaveLength(0);
  });

  it("rejects a malformed address instead of guessing at it", async () => {
    const { rugCheck } = await loadRugCheck();
    const result = await rugCheck("0xnope");
    expect(result.ok).toBe(false);
    expect(mockClient.getCode).not.toHaveBeenCalled();
  });
});
