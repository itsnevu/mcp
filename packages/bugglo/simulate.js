/* Read-only SELL simulation for Robinhood Chain (4663) — the check the article calls buildable
 * but "not built yet". This builds it, and keeps the same rule as everything else here: it either
 * returns evidence or it returns UNKNOWN. It NEVER returns a clean PASS it did not earn.
 *
 * WHAT IT ACTUALLY DOES, precisely — because overclaiming here would be the worst kind.
 *
 * The first move of every Uniswap-V2-style sell is: send your tokens to the pool contract. A huge
 * class of honeypots — "vanishing token" traps, blacklist-by-default tokens, trading-not-enabled
 * gates — work by making exactly that transfer revert (or silently return false) for everyone who
 * is not the deployer. So we simulate that transfer, read-only, and watch what happens.
 *
 * eth_call is read-only: it runs the EVM against current state, changes nothing, needs no key and
 * no gas funds. We use a STATE OVERRIDE to hand a synthetic holder a balance of the token (so we
 * are not spending anyone's real coins or borrowing their position), then eth_call `transfer(pool,
 * amount)` FROM that holder. Reverts or a false return mean the tokens cannot even reach the pool —
 * you could never sell. That is a hard, provable honeypot signal.
 *
 * WHAT IT DELIBERATELY DOES NOT CLAIM — stated so the gate never rounds it up:
 *   - It does not prove you CAN sell. A token that lets the transfer through but blocks the router's
 *     swap(), or applies a 100% sell TAX, would pass this and still trap you. Measuring the ETH that
 *     comes back out needs a transfer+swap bundle (a helper contract deployed via override), which
 *     is the next build. Until then a passing transfer sim is "the tokens can move", not "you can exit".
 *   - If the node does not support eth_call state overrides, or the token's balance slot cannot be
 *     located, the result is UNKNOWN. Not PASS. Never PASS.
 */

import {
  encodeFunctionData,
  encodeAbiParameters,
  keccak256,
  getAddress,
  isAddress,
} from "viem";
import { chainClient } from "./chain.js";
import { getMarket } from "./chain.js";

/* A synthetic holder we fund by override. It owns nothing real; it exists only inside the eth_call.
   A fixed, obviously-fake address so a reader of a trace knows instantly this was a simulation. */
const SIM_HOLDER = getAddress("0x00000000000000000000000000000000B0001355");

/* A distinctive balance to inject and then look for, so the slot probe cannot be fooled by a token
   that happens to return a round number. ~1.2e29 wei — large enough to sell meaningfully, small
   enough to never overflow a uint256 accumulator. */
const MAGIC = 123456789012345678901234567890n;

const BALANCE_OF = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];
const TRANSFER = [
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];

function toBytes32(value) {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

/* The storage key of balanceOf[holder] for mapping declared at slot `p`. Solidity lays a mapping
   value at keccak256(abi.encode(key, slot)); Vyper reverses the two. We try both so the probe is
   not fooled by a Vyper-compiled token. */
function slotKeys(holder, p) {
  const sol = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [holder, BigInt(p)]));
  const vyper = keccak256(encodeAbiParameters([{ type: "uint256" }, { type: "address" }], [BigInt(p), holder]));
  return [sol, vyper];
}

/* eth_call balanceOf(holder) with `token`'s storage overridden so `slot` holds MAGIC. If the token
   reads its balance from that slot, the call returns MAGIC and we have found the layout. */
async function readsMagicFrom(token, slot) {
  try {
    const data = await chainClient().call({
      to: token,
      data: encodeFunctionData({ abi: BALANCE_OF, functionName: "balanceOf", args: [SIM_HOLDER] }),
      stateOverride: [{ address: token, stateDiff: [{ slot, value: toBytes32(MAGIC) }] }],
    });
    return BigInt(data?.data || "0x0") === MAGIC;
  } catch {
    /* A thrown error here is almost always "this node does not implement state overrides" — which
       the caller must treat as UNKNOWN, never as "slot not found". We surface that by re-throwing a
       tagged error the caller can distinguish from an ordinary miss. */
    throw new Error("stateOverrideUnsupported");
  }
}

/**
 * Locate the token's balanceOf storage slot by probing the low slots (where every mainstream ERC-20
 * puts it). Returns the winning storage key, or null if none of the probed slots reads it back.
 * Throws "stateOverrideUnsupported" if the node cannot do overrides at all.
 */
async function findBalanceSlot(token) {
  const MAX_SLOT = 20; // OpenZeppelin=0, many forks 0-9; 20 covers the long tail without blowing latency
  let overridesUnsupported = false;

  for (let p = 0; p <= MAX_SLOT; p++) {
    for (const slot of slotKeys(SIM_HOLDER, p)) {
      try {
        if (await readsMagicFrom(token, slot)) return slot;
      } catch (e) {
        if (String(e?.message) === "stateOverrideUnsupported") {
          overridesUnsupported = true;
          break; // no point probing further slots on a node that ignores overrides
        }
      }
    }
    if (overridesUnsupported) break;
  }

  if (overridesUnsupported) throw new Error("stateOverrideUnsupported");
  return null;
}

/**
 * Simulate the first, load-bearing step of a sell: move tokens into the pool.
 *
 * → { ok, status, transferable, destination, note, evidence }
 *     status: "SELLABLE-SO-FAR" | "CANNOT-MOVE" | "UNKNOWN"
 *
 *   SELLABLE-SO-FAR  the synthetic holder's tokens reached the pool without reverting. NOT a promise
 *                    you can exit — the swap and any sell tax are not measured here (see header).
 *   CANNOT-MOVE      the transfer reverted or returned false. You could not even begin to sell. This
 *                    is a hard honeypot signal.
 *   UNKNOWN          the node has no state overrides, the balance slot could not be found, or there
 *                    is no pool to sell into. We could not run the sim — so we say nothing.
 */
export async function simulateSell(rawAddress) {
  if (!isAddress(rawAddress)) {
    return { ok: false, error: "That is not a valid EVM address." };
  }
  const token = getAddress(rawAddress);

  /* Sell INTO the real pool when we can find one — that is the address a honeypot actually gates on.
     With no pool we cannot run a meaningful sell sim; a transfer to a random EOA would test the wrong
     thing (honeypots routinely allow wallet-to-wallet and block only the pool). So: no pool → UNKNOWN. */
  const market = await getMarket(token);
  const destination = market?.ok && market.hasMarket ? market.pairAddress : null;
  /* Guard the pair address before trusting it: DexScreener occasionally returns a non-EVM-address
     pool identifier (a 32-byte hash for some pool types), and a sell into an address we cannot form
     is a sell we cannot simulate — UNKNOWN, never a crash and never a pass. */
  if (!destination || !isAddress(destination)) {
    return {
      ok: true,
      status: "UNKNOWN",
      transferable: null,
      destination: destination || null,
      note: destination
        ? "The DEX pool identifier is not a standard address, so a sell into it cannot be simulated from here. UNKNOWN, not PASS."
        : "No DEX pool found to sell into, so a sell cannot be simulated. This is not a pass — it is an absent market.",
      evidence: null,
    };
  }
  const pool = getAddress(destination);

  let slot;
  try {
    slot = await findBalanceSlot(token);
  } catch (e) {
    if (String(e?.message) === "stateOverrideUnsupported") {
      return {
        ok: true,
        status: "UNKNOWN",
        transferable: null,
        destination: pool,
        note: "The RPC does not support eth_call state overrides, so the sell simulation cannot run here. UNKNOWN, not PASS.",
        evidence: null,
      };
    }
    return { ok: false, error: `sell simulation failed: ${String(e?.message || e).slice(0, 160)}` };
  }

  if (!slot) {
    return {
      ok: true,
      status: "UNKNOWN",
      transferable: null,
      destination: pool,
      note: "Could not locate the token's balance storage slot in the first 20 slots, so a funded sell could not be simulated. UNKNOWN, not PASS.",
      evidence: null,
    };
  }

  const stateOverride = [{ address: token, stateDiff: [{ slot, value: toBytes32(MAGIC) }] }];
  const amount = MAGIC / 2n; // sell half the injected balance — a real, non-trivial move

  try {
    const result = await chainClient().call({
      account: SIM_HOLDER,
      to: token,
      data: encodeFunctionData({ abi: TRANSFER, functionName: "transfer", args: [pool, amount] }),
      stateOverride,
    });

    /* transfer() can signal failure two ways: revert (caught below) or a plain `false` return with
       no revert. The second is the quieter honeypot, and folding it into "success" would be the
       exact kind of miss this file exists to prevent. */
    const raw = result?.data ?? "0x";
    const returnedFalse = /^0x0*$/.test(raw) && raw !== "0x"; // 32 bytes of zero === false
    if (returnedFalse) {
      return {
        ok: true,
        status: "CANNOT-MOVE",
        transferable: false,
        destination: pool,
        note: "transfer() into the pool returned false without reverting — the tokens cannot be moved to sell. This is a honeypot signal.",
        evidence: { slot, returned: raw },
      };
    }

    return {
      ok: true,
      status: "SELLABLE-SO-FAR",
      transferable: true,
      destination: pool,
      note: "A funded synthetic holder could transfer tokens into the pool without reverting. This means the tokens can MOVE — it does not prove you can exit, because the swap and any sell tax are not measured here.",
      evidence: { slot },
    };
  } catch (error) {
    return {
      ok: true,
      status: "CANNOT-MOVE",
      transferable: false,
      destination: pool,
      note: `transfer() into the pool reverted (${String(error?.shortMessage || error?.message || error).slice(0, 120)}). You could not even begin to sell — a hard honeypot signal.`,
      evidence: { slot },
    };
  }
}
