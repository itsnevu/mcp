/* Bugglo Firewall — the pre-trade policy gate. The core idea of the whole pivot: an AI agent with a
 * wallet is the softest target in DeFi (it will act on injected instructions, it cannot see a chain
 * it never read), so put the safety check OUTSIDE the model, as a gate the agent must pass BEFORE it
 * swaps. Advisor → enforcer.
 *
 * This is not a new engine. It composes the SAME rugCheck() every door already uses, adds the
 * read-only sell simulation and the RWA registry check, and turns them into ONE machine-readable
 * decision: ALLOW / BLOCK / UNKNOWN, worst reason first.
 *
 * THE DECISION RULE — and why UNKNOWN is a first-class outcome, not a soft ALLOW.
 *
 * A firewall that fails open is not a firewall. So the gate only says ALLOW when safety was actually
 * PROVEN in the ways it can prove — no FAIL signals, and a sell simulation that actually ran and did
 * not trip. If the sell sim could not run, or the chain could not be read, the answer is UNKNOWN, and
 * an agent MUST treat UNKNOWN exactly like BLOCK for the purpose of auto-executing: do not trade,
 * escalate to a human. ALLOW is "no blocker proven", never "safe", and the payload says so.
 */

import { rugCheck } from "./chain.js";
import { simulateSell } from "./simulate.js";
import { verifyAgainstRegistry } from "./registry.js";

const DEFAULTS = {
  /* Below this the pool is too thin for a real exit — a small sell craters the price. Tunable per
     agent, because a memecoin scalper and a stock-token desk have different floors. */
  minLiquidityUsd: Number(process.env.BUGGLO_GATE_MIN_LIQUIDITY_USD) || 5_000,
  /* Require the sell simulation to have actually run and passed before ALLOW. On by default — this is
     the whole point of a firewall. An agent can lower it to "advisory" but must opt in explicitly. */
  requireSellProof: process.env.BUGGLO_GATE_REQUIRE_SELL_PROOF !== "false",
  /* A valuation many multiples above the pool is a paper price. Above this ratio → warn/block. */
  maxFdvToLiquidity: Number(process.env.BUGGLO_GATE_MAX_FDV_RATIO) || 50,
};

const SEV_ORDER = { BLOCK: 0, WARN: 1, UNKNOWN: 2, INFO: 3 };

/**
 * @param rawAddress   token an agent is about to trade
 * @param opts         { side?: "buy"|"sell", policy?: Partial<DEFAULTS> }
 * → {
 *     decision: "ALLOW" | "BLOCK" | "UNKNOWN",
 *     address, chain, chainId, side,
 *     reasons: [{ severity, code, message }],   // worst first
 *     rug: { verdict, signals },                // the underlying rug check, unabridged
 *     sellSimulation: {...},
 *     rwa: {...},
 *     policy, disclaimer,
 *   }
 */
export async function tradeGate(rawAddress, opts = {}) {
  const side = opts.side === "sell" ? "sell" : "buy";
  const policy = { ...DEFAULTS, ...(opts.policy || {}) };

  const [rug, sell] = await Promise.all([rugCheck(rawAddress), simulateSell(rawAddress)]);

  if (rug.ok === false) {
    return {
      decision: "UNKNOWN",
      address: rawAddress,
      chain: "Robinhood Chain",
      side,
      reasons: [{ severity: "UNKNOWN", code: "bad-input", message: rug.error }],
      rug: null,
      sellSimulation: null,
      rwa: null,
      policy,
      disclaimer: DISCLAIMER,
    };
  }

  const reasons = [];
  let hardBlock = false; // a proven danger → BLOCK
  let sellProven = false; // the sell simulation actually ran AND passed → the thing ALLOW hinges on

  /* ── The rug check's own verdict feeds straight in ─────────────────────────────────────────── */
  if (rug.verdict === "NOT A CONTRACT") {
    hardBlock = true;
    reasons.push({ severity: "BLOCK", code: "not-a-contract", message: "No code at this address — there is nothing to trade. If you expected a token, the address may be wrong or on another chain." });
  }
  if (rug.verdict === "CANNOT CHECK") {
    reasons.push({ severity: "UNKNOWN", code: "chain-unreachable", message: "Could not reach Robinhood Chain to inspect this contract. No findings — good or bad. Do not auto-trade on a blind read." });
  }

  const failSignals = (rug.signals || []).filter((s) => s.status === "FAIL");
  for (const s of failSignals) {
    hardBlock = true;
    reasons.push({ severity: "BLOCK", code: `rug:${s.key}`, message: `${s.label}: ${s.detail}` });
  }

  /* WARN signals are surfaced but do not, on their own, block — plenty of honest tokens are owned
     or mintable. They are the "look closer" the article's CAUTION verdict is built around. */
  for (const s of (rug.signals || []).filter((x) => x.status === "WARN")) {
    reasons.push({ severity: "WARN", code: `rug:${s.key}`, message: `${s.label}: ${s.detail}` });
  }
  /* An UNKNOWN rug signal (e.g. no owner() function) is surfaced to the agent, but it does NOT on
     its own deny an ALLOW — that gate hinges on the sell proof below, not on every open question. */
  for (const s of (rug.signals || []).filter((x) => x.status === "UNKNOWN")) {
    reasons.push({ severity: "UNKNOWN", code: `rug:${s.key}`, message: `${s.label}: ${s.detail}` });
  }

  /* ── Sell simulation — the enforcer's teeth ────────────────────────────────────────────────── */
  if (sell?.ok && sell.status === "CANNOT-MOVE") {
    hardBlock = true;
    reasons.push({ severity: "BLOCK", code: "sell-sim:cannot-move", message: `Sell simulation: ${sell.note}` });
  } else if (sell?.ok && sell.status === "SELLABLE-SO-FAR") {
    sellProven = true;
    reasons.push({ severity: "INFO", code: "sell-sim:movable", message: `Sell simulation: ${sell.note}` });
  } else {
    /* UNKNOWN sell sim. requireSellProof decides whether the absence of a sell proof denies ALLOW. */
    reasons.push({ severity: "UNKNOWN", code: "sell-sim:unproven", message: `Sell simulation could not run: ${sell?.note || sell?.error || "no result"}` });
  }

  /* ── Liquidity floor ───────────────────────────────────────────────────────────────────────── */
  const liq = (rug.signals || []).find((s) => s.key === "liquidity");
  const market = extractLiquidity(rug);
  if (market.liquidityUsd != null && market.liquidityUsd < policy.minLiquidityUsd) {
    reasons.push({ severity: "WARN", code: "liquidity:thin", message: `Deepest pool is only $${Math.round(market.liquidityUsd).toLocaleString()}, below the $${policy.minLiquidityUsd.toLocaleString()} floor — a real-size exit would move the price hard.` });
  }

  /* ── RWA impostor check ────────────────────────────────────────────────────────────────────── */
  const rwa = verifyAgainstRegistry(rawAddress, rug.token || {});
  if (rwa.status === "IMPOSTOR-SUSPECT") {
    hardBlock = true;
    reasons.push({ severity: "BLOCK", code: "rwa:impostor", message: rwa.note });
  } else if (rwa.status === "OFFICIAL") {
    reasons.push({ severity: "INFO", code: "rwa:official", message: rwa.note });
  }

  /* ── Compose the decision ──────────────────────────────────────────────────────────────────── */
  let decision;
  if (hardBlock) {
    decision = "BLOCK";
  } else if (policy.requireSellProof && !sellProven) {
    /* No danger proven, but the one thing a trading firewall must confirm — that the token can be
       sold — was not proven. A firewall fails CLOSED: UNKNOWN, do not auto-trade, escalate. */
    decision = "UNKNOWN";
  } else {
    decision = "ALLOW";
  }

  reasons.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));

  return {
    decision,
    address: rug.address,
    chain: "Robinhood Chain",
    chainId: rug.chainId ?? 4663,
    side,
    token: rug.token || null,
    reasons,
    verdictOfRugCheck: rug.verdict,
    rug: { verdict: rug.verdict, signals: rug.signals, unmeasured: rug.unmeasured },
    sellSimulation: sell,
    rwa,
    policy,
    disclaimer: DISCLAIMER,
  };
}

function extractLiquidity(rug) {
  const s = (rug.signals || []).find((x) => x.key === "liquidity");
  if (!s) return { liquidityUsd: null };
  const m = /\$([\d,]+)/.exec(s.detail || "");
  return { liquidityUsd: m ? Number(m[1].replace(/,/g, "")) : null };
}

const DISCLAIMER =
  "ALLOW means no blocker was PROVEN — never that the token is safe. UNKNOWN means safety could not be " +
  "proven; an agent must treat it like BLOCK for auto-execution and escalate to a human. BLOCK means a " +
  "concrete danger was found. Read-only, not financial advice.";
