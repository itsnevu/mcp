import { beforeEach, describe, expect, it } from "vitest";
import {
  acquire,
  estimateRequestUsd,
  usageToUsd,
  budgetSnapshot,
  clientIpFrom,
} from "@/lib/rateLimit";

const ENV = [
  "ENGINE_MAX_PER_MINUTE",
  "ENGINE_MAX_PER_HOUR",
  "ENGINE_MAX_PER_DAY",
  "ENGINE_MAX_CONCURRENT",
  "ENGINE_MAX_CONCURRENT_PER_USER",
  "ENGINE_USER_USD_PER_DAY",
  "ENGINE_GLOBAL_USD_PER_DAY",
  "ENGINE_IP_MAX_PER_MINUTE",
  "ENGINE_IP_MAX_PER_DAY",
  "ENGINE_IP_USD_PER_DAY",
  "ENGINE_TRUSTED_PROXIES",
  "ENGINE_PRICE_INPUT_PER_MTOK",
  "ENGINE_PRICE_OUTPUT_PER_MTOK",
];

function configure(overrides) {
  for (const name of ENV) delete process.env[name];
  for (const [name, value] of Object.entries(overrides)) process.env[name] = String(value);
}

/* Roomy defaults on the axis a test is not exercising, so only the cap under test can fire. */
const LOOSE = {
  ENGINE_MAX_CONCURRENT_PER_USER: 10,
  ENGINE_MAX_CONCURRENT: 100,
  ENGINE_IP_MAX_PER_MINUTE: 1000,
  ENGINE_IP_MAX_PER_DAY: 1000,
  ENGINE_IP_USD_PER_DAY: 1000,
};

let n = 0;
const freshIp = () => `ip-${(n += 1)}`;

beforeEach(() => {
  delete globalThis.__robinxBudget; // the budget is process-global; start every test cold
  for (const name of ENV) delete process.env[name];
});

describe("spend guard", () => {
  it("lets a normal request through and frees the slot on release", () => {
    configure({ ...LOOSE, ENGINE_MAX_CONCURRENT_PER_USER: 1 });
    const scope = { userKey: "a", ipKey: freshIp() };

    const first = acquire(scope, 0.001);
    expect(first.ok).toBe(true);

    // A second in-flight request from the same user is refused while the first is running.
    expect(acquire(scope, 0.001).ok).toBe(false);

    first.release();
    expect(acquire(scope, 0.001).ok).toBe(true);
  });

  it("caps requests per minute", () => {
    configure({ ...LOOSE, ENGINE_MAX_PER_MINUTE: 3 });
    const scope = { userKey: "b", ipKey: freshIp() };

    for (let i = 0; i < 3; i += 1) {
      const claim = acquire(scope, 0.0001);
      expect(claim.ok).toBe(true);
      claim.release();
    }
    const denied = acquire(scope, 0.0001);
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe("user-rate-minute");
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it("refuses a request that would push the day over its cap, instead of noticing afterwards", () => {
    configure({ ...LOOSE, ENGINE_USER_USD_PER_DAY: 0.1 });
    const scope = { userKey: "c", ipKey: freshIp() };

    const first = acquire(scope, 0.08);
    expect(first.ok).toBe(true);
    first.release();

    // 0.08 is already reserved; another 0.08 would land at 0.16, past the 0.10 ceiling.
    // The reservation is the whole point — without it both calls pass and we overspend.
    const denied = acquire(scope, 0.08);
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe("user-spend");
  });

  it("settles the reservation down to what the call actually cost", () => {
    configure({ ...LOOSE, ENGINE_USER_USD_PER_DAY: 0.1 });
    const scope = { userKey: "d", ipKey: freshIp() };

    const first = acquire(scope, 0.08);
    expect(first.ok).toBe(true);
    first.settle(0.001); // the request turned out cheap
    first.release();

    // Only ~0.001 was really spent, so there is plenty of headroom for the next one.
    expect(acquire(scope, 0.08).ok).toBe(true);
  });

  it("makes one machine pay for every account it drives", () => {
    // The abuse case: signing up is free, so a spammer re-rolls the session and keeps going.
    // Per-user caps alone would never fire. The IP axis is what actually stops them.
    configure({ ...LOOSE, ENGINE_IP_MAX_PER_MINUTE: 4, ENGINE_MAX_PER_MINUTE: 1000 });
    const ipKey = freshIp();

    for (let i = 0; i < 4; i += 1) {
      const claim = acquire({ userKey: `throwaway-${i}`, ipKey }, 0.0001);
      expect(claim.ok, `fresh account #${i} should still be within the IP cap`).toBe(true);
      claim.release();
    }

    const denied = acquire({ userKey: "throwaway-5", ipKey }, 0.0001);
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe("ip-rate-minute");
  });

  it("stops everyone once the global daily cap is reached", () => {
    configure({ ...LOOSE, ENGINE_GLOBAL_USD_PER_DAY: 0.05 });

    const first = acquire({ userKey: "e", ipKey: freshIp() }, 0.04);
    expect(first.ok).toBe(true);
    first.release();

    // A different user on a different machine — the global cap still binds. This is the
    // number that actually bounds the bill when identities and IPs are both cheap.
    const other = acquire({ userKey: "f", ipKey: freshIp() }, 0.04);
    expect(other.ok).toBe(false);
    expect(other.reason).toBe("global-spend");
    expect(budgetSnapshot().spentUsdToday).toBeCloseTo(0.04, 5);
  });

  it("prices a request from real token counts when the gateway quotes no cost", () => {
    configure({ ENGINE_PRICE_INPUT_PER_MTOK: 1, ENGINE_PRICE_OUTPUT_PER_MTOK: 2 });
    // 1M input at $1 + 1M output at $2 = $3
    expect(usageToUsd({ prompt_tokens: 1e6, completion_tokens: 1e6 })).toBeCloseTo(3, 6);
    // A quoted cost always wins over the estimate.
    expect(usageToUsd({ prompt_tokens: 1e6, completion_tokens: 1e6, cost: 0.5 })).toBe(0.5);
    expect(usageToUsd(null)).toBe(0);
  });

  it("estimates a Deep run as costing more than a Fast one", () => {
    configure({ ENGINE_PRICE_INPUT_PER_MTOK: 1, ENGINE_PRICE_OUTPUT_PER_MTOK: 2 });
    const fast = estimateRequestUsd({ maxTokens: 768, maxIterations: 2, promptChars: 4000 });
    const deep = estimateRequestUsd({ maxTokens: 2048, maxIterations: 6, promptChars: 4000 });
    expect(deep).toBeGreaterThan(fast);
    expect(fast).toBeGreaterThan(0);
  });
});

describe("client IP derivation", () => {
  const headers = (xff) => new Headers(xff ? { "x-forwarded-for": xff } : {});

  it("ignores the spoofable left end of x-forwarded-for", () => {
    configure({ ENGINE_TRUSTED_PROXIES: 1 });
    // The attacker prepends whatever they like; our edge appends what it actually saw.
    // Taking [0] would let them rotate their bucket per request and reset every cap.
    expect(clientIpFrom(headers("1.1.1.1, 9.9.9.9"))).toBe("9.9.9.9");
    expect(clientIpFrom(headers("fake, fake2, 9.9.9.9"))).toBe("9.9.9.9");
  });

  it("counts hops from the right for a deeper proxy chain", () => {
    configure({ ENGINE_TRUSTED_PROXIES: 2 });
    expect(clientIpFrom(headers("spoof, 8.8.8.8, 10.0.0.1"))).toBe("8.8.8.8");
  });

  it("falls back to the socket address when there is no proxy", () => {
    configure({});
    expect(clientIpFrom(headers(), "5.5.5.5")).toBe("5.5.5.5");
  });
});
