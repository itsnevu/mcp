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
  decodeAbiParameters,
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
async function readsMagicFrom(token, slot, holder = SIM_HOLDER) {
  try {
    const data = await chainClient().call({
      to: token,
      data: encodeFunctionData({ abi: BALANCE_OF, functionName: "balanceOf", args: [holder] }),
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
async function findBalanceSlot(token, holder = SIM_HOLDER) {
  const MAX_SLOT = 20; // OpenZeppelin=0, many forks 0-9; 20 covers the long tail without blowing latency
  let overridesUnsupported = false;

  for (let p = 0; p <= MAX_SLOT; p++) {
    for (const slot of slotKeys(holder, p)) {
      try {
        if (await readsMagicFrom(token, slot, holder)) return slot;
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

/* ── Full-exit simulation ────────────────────────────────────────────────────────────────────
 *
 * simulateSell() above proves the tokens can MOVE. It says so, and it stops there, because a
 * transfer that clears is not an exit: a sell tax or a pool that refuses to pay out both leave
 * that check green and still trap you. This is the part that closes it.
 *
 * Chain 4663's Uniswap is V3, not V2 (getReserves() reverts on a real pair; slot0() and fee()
 * answer). V3 settles a swap by sending the output FIRST, calling the payer back, and then
 * checking its own balance actually rose by the input. That ordering is what makes an honest
 * answer possible from a read-only call: we inject a probe contract that pays the callback with a
 * REAL token.transfer(), and let the pool's own accounting be the judge.
 *
 * The probe (BuggloExitProbe.sol, in this directory) is never deployed. Its runtime bytecode is
 * injected for the duration of one eth_call via a `code` state override, at an address that holds
 * nothing. No key, no gas, no transaction. Bugglo stays read-only.
 *
 * Regenerate EXIT_PROBE_RUNTIME with the command in the header of BuggloExitProbe.sol. The source
 * and this constant must be changed together or the comment above it becomes a lie.
 */

export const EXIT_PROBE_RUNTIME =
  "0x" +
  "608060405234801561000f575f80fd5b5060043610610034575f3560e01c806312371d7f14610038578063fa461e33146100" +
  "64575b5f80fd5b61004b61004636600461043f565b610079565b6040805192835260208301919091520160405180910390f3" +
  "5b6100776100723660046104b4565b6102fc565b005b5f80546001600160a01b038881166001600160a01b03199283161783" +
  "55600180549189169190921681179091556040516370a0823160e01b8152306004820152829182916370a082319060240160" +
  "2060405180830381865afa1580156100e1573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081" +
  "01906101059190610530565b6040516370a0823160e01b81523060048201529091505f906001600160a01b038616906370a0" +
  "823190602401602060405180830381865afa15801561014c573d5f803e3d5ffd5b505050506040513d601f19601f82011682" +
  "0180604052508101906101709190610530565b604051630251596160e31b8152306004820152891515602482015260448101" +
  "8990526001600160a01b03888116606483015260a060848301525f60a4830152919250908b169063128acb089060c4016040" +
  "8051808303815f875af11580156101da573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101" +
  "906101fe9190610547565b50506040516370a0823160e01b81523060048201525f906001600160a01b038716906370a08231" +
  "90602401602060405180830381865afa158015610244573d5f803e3d5ffd5b505050506040513d601f19601f820116820180" +
  "604052508101906102689190610530565b6040516370a0823160e01b81523060048201529091505f906001600160a01b038c" +
  "16906370a0823190602401602060405180830381865afa1580156102af573d5f803e3d5ffd5b505050506040513d601f1960" +
  "1f820116820180604052508101906102d39190610530565b90506102df8383610569565b95506102eb8185610569565b9450" +
  "50505050965096945050505050565b5f546001600160a01b0316331461034e5760405162461bcd60e51b8152602060048201" +
  "5260116024820152703ab732bc3832b1ba32b21031b0b63632b960791b60448201526064015b60405180910390fd5b5f8085" +
  "1361035c578361035e565b845b90505f811361039e5760405162461bcd60e51b815260206004820152600c60248201526b1b" +
  "9bdd1a1a5b99c81bddd95960a21b6044820152606401610345565b6001545f5460405163a9059cbb60e01b81526001600160" +
  "a01b0391821660048201526024810184905291169063a9059cbb906044016020604051808303815f875af11580156103ef57" +
  "3d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610413919061058e565b505050505050" +
  "565b6001600160a01b038116811461042f575f80fd5b50565b801515811461042f575f80fd5b5f805f805f8060c087890312" +
  "15610454575f80fd5b863561045f8161041b565b9550602087013561046f8161041b565b9450604087013561047f81610432" +
  "565b93506060870135925060808701356104968161041b565b915060a08701356104a68161041b565b809150509295509295" +
  "509295565b5f805f80606085870312156104c7575f80fd5b8435935060208501359250604085013567ffffffffffffffff81" +
  "11156104eb575f80fd5b8501601f810187136104fb575f80fd5b803567ffffffffffffffff811115610511575f80fd5b8760" +
  "20828401011115610522575f80fd5b949793965060200194505050565b5f60208284031215610540575f80fd5b5051919050" +
  "565b5f8060408385031215610558575f80fd5b505080516020909101519092909150565b8181038181111561058857634e48" +
  "7b7160e01b5f52601160045260245ffd5b92915050565b5f6020828403121561059e575f80fd5b81516105a981610432565b" +
  "939250505056fea26469706673582212205ca8f7fa20664de4b6847270eba29930482c85456dabae31d156d37363e368ee64" +
  "736f6c634300081a0033";

/* The probe answers with two uint256s, so a successful call returns EXACTLY 64 bytes.
 *
 * This length check is load-bearing, not defensive dressing. A node that silently ignores `code`
 * state overrides leaves nothing at the probe address, and a call to an address with no code does
 * not revert on the EVM — it succeeds and returns empty. Decoded loosely, that reads as a clean
 * result with zeroes in it, which is the exact shape of the bug this whole project argues against:
 * an absence dressed up as a finding. Measured against a live node, this is not hypothetical; it
 * was reproduced during development. Anything other than 64 bytes is UNKNOWN. */
const EXIT_PROBE_RETURN_BYTES = 64;

/* An obviously-fake address, like SIM_HOLDER, so anyone reading a trace knows this was simulated. */
const EXIT_PROBE = getAddress("0x00000000000000000000000000000000B0002E57");

/* V3 refuses a swap whose price would cross this bound. Setting it to the extreme in the direction
   of travel means "no limit" — we want whatever the pool will actually give, not a target price. */
const MIN_SQRT_RATIO = 4295128739n;
const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

const POOL_TOKENS = [
  { name: "token0", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "token1", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];
const DECIMALS = [
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];
const PROBE_EXIT = [
  {
    name: "probeExit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address" }, { type: "address" }, { type: "bool" },
      { type: "uint256" }, { type: "uint160" }, { type: "address" },
    ],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
  },
];

function unknownExit(note, extra = {}) {
  return { ok: true, status: "UNKNOWN", exits: null, received: null, note, evidence: null, ...extra };
}

/**
 * Simulate a COMPLETE sell: tokens into the pool, swap executed, output measured.
 *
 * → { ok, status, exits, received, note, evidence }
 *     status: "EXIT-CLEARS" | "CANNOT-EXIT" | "UNKNOWN"
 *
 *   EXIT-CLEARS  the swap cleared and we measured what came back, at this block, at this size,
 *                for a synthetic holder. Not a promise about you, later, or at another size.
 *   CANNOT-EXIT  the swap reverted. Combined with simulateSell()'s transfer result we can say
 *                whether the tokens could not move at all, or moved and the pool still refused.
 *   UNKNOWN      no pool, no balance slot, no state-override support, or a probe that did not
 *                answer in the expected shape. Never PASS.
 */
export async function simulateExit(rawAddress) {
  if (!isAddress(rawAddress)) return { ok: false, error: "That is not a valid EVM address." };
  const token = getAddress(rawAddress);

  const market = await getMarket(token);
  const pairAddress = market?.ok && market.hasMarket ? market.pairAddress : null;
  if (!pairAddress || !isAddress(pairAddress)) {
    return unknownExit(
      pairAddress
        ? "The DEX pool identifier is not a standard address, so an exit cannot be simulated from here. UNKNOWN, not PASS."
        : "No DEX pool found to sell into, so an exit cannot be simulated. This is not a pass — it is an absent market."
    );
  }
  const pool = getAddress(pairAddress);

  /* Which side of the pair the token sits on decides the direction of the swap, and the direction
     decides which price bound means "no limit". Read it from the pool rather than assuming. */
  let token0;
  let token1;
  let decimals;
  try {
    const client = chainClient();
    const [t0, t1, dec] = await Promise.all([
      client.call({ to: pool, data: encodeFunctionData({ abi: POOL_TOKENS, functionName: "token0", args: [] }) }),
      client.call({ to: pool, data: encodeFunctionData({ abi: POOL_TOKENS, functionName: "token1", args: [] }) }),
      client.call({ to: token, data: encodeFunctionData({ abi: DECIMALS, functionName: "decimals", args: [] }) }),
    ]);
    token0 = getAddress(`0x${String(t0?.data || "").slice(26, 66)}`);
    token1 = getAddress(`0x${String(t1?.data || "").slice(26, 66)}`);
    decimals = Number(BigInt(dec?.data || "0x12"));
  } catch {
    /* A pair that answers neither token0() nor slot0() is not a V3 pool we can drive. Some other
       pool type may well be sellable; we simply cannot prove it from here. */
    return unknownExit(
      "The pool does not expose the Uniswap V3 interface, so an exit cannot be simulated from here. UNKNOWN, not PASS."
    );
  }

  if (token0 !== token && token1 !== token) {
    return unknownExit("The pool does not hold this token, so an exit through it cannot be simulated. UNKNOWN, not PASS.");
  }
  const zeroForOne = token0 === token;
  const counterToken = zeroForOne ? token1 : token0;
  const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n;

  let slot;
  try {
    slot = await findBalanceSlot(token, EXIT_PROBE);
  } catch (e) {
    if (String(e?.message) === "stateOverrideUnsupported") {
      return unknownExit("The RPC does not support eth_call state overrides, so an exit cannot be simulated here. UNKNOWN, not PASS.");
    }
    return { ok: false, error: `exit simulation failed: ${String(e?.message || e).slice(0, 160)}` };
  }
  if (!slot) {
    return unknownExit("Could not locate the token's balance storage slot, so a funded exit could not be simulated. UNKNOWN, not PASS.");
  }

  /* Sized in whole tokens rather than as a share of supply: a fixed fraction of a large supply is
     enough to move the price on a thin pool, and a swap that fails only because it was too big for
     the liquidity is a fact about the pool, not about the token. Fund double so the probe's own
     transfer is never the thing that runs out. */
  const amountIn = 10n ** BigInt(decimals);

  let raw;
  try {
    const result = await chainClient().call({
      to: EXIT_PROBE,
      data: encodeFunctionData({
        abi: PROBE_EXIT,
        functionName: "probeExit",
        args: [pool, token, zeroForOne, amountIn, sqrtPriceLimitX96, counterToken],
      }),
      stateOverride: [
        { address: EXIT_PROBE, code: EXIT_PROBE_RUNTIME },
        { address: token, stateDiff: [{ slot, value: toBytes32(amountIn * 2n) }] },
      ],
    });
    raw = result?.data ?? "0x";
  } catch (error) {
    return {
      ok: true,
      status: "CANNOT-EXIT",
      exits: false,
      received: null,
      note:
        "A funded synthetic holder could not complete a sell through the pool: the swap reverted. " +
        "That is what a blocked transfer, a sell tax the pool will not accept, or a pool that takes " +
        "the tokens and refuses to pay all look like from here. It is a hard signal against exiting.",
      evidence: { pool, slot, amountIn: amountIn.toString(), reason: String(error?.shortMessage || error?.message || error).slice(0, 140) },
    };
  }

  if (typeof raw !== "string" || (raw.length - 2) / 2 !== EXIT_PROBE_RETURN_BYTES) {
    return unknownExit(
      "The exit probe did not answer in its expected shape, which is what a node that ignores code " +
        "state overrides looks like. Refusing to read that as a pass. UNKNOWN, not PASS.",
      { evidence: null }
    );
  }

  const [received, paid] = decodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], raw);
  if (received === 0n) {
    return {
      ok: true,
      status: "CANNOT-EXIT",
      exits: false,
      received: "0",
      note: "The swap completed but returned nothing at all. Tokens left the holder and no value came back — an exit in name only.",
      evidence: { pool, slot, amountIn: amountIn.toString(), paid: paid.toString() },
    };
  }

  return {
    ok: true,
    status: "EXIT-CLEARS",
    exits: true,
    received: received.toString(),
    note:
      "A funded synthetic holder completed a full sell through the pool and received value back, at " +
      "this block and at this size. That is the strongest read-only evidence of sellability there is — " +
      "it is not a promise: an owner can change the rules in the next transaction, and a token that " +
      "gates on the holder's address may treat a real wallet differently.",
    evidence: { pool, slot, counterToken, amountIn: amountIn.toString(), paid: paid.toString() },
  };
}
