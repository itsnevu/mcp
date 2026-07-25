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
  "64575b5f80fd5b61004b610046366004610504565b610079565b6040805192835260208301919091520160405180910390f3" +
  "5b610077610072366004610579565b6103c6565b005b6001545f908190600160a01b900460ff16156100ce5760405162461b" +
  "cd60e51b815260206004820152600f60248201526e7265656e7472616e742070726f626560881b60448201526064015b6040" +
  "5180910390fd5b6001805460ff60a01b1916600160a01b1790556001600160ff1b038511156101385760405162461bcd60e5" +
  "1b815260206004820152601760248201527f616d6f756e74496e206578636565647320696e74323536000000000000000000" +
  "60448201526064016100c5565b5f80546001600160a01b038a81166001600160a01b031992831617835560018054918b1691" +
  "90921681179091556040516370a0823160e01b81523060048201526370a0823190602401602060405180830381865afa1580" +
  "1561019c573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906101c091906105f5565b60" +
  "40516370a0823160e01b81523060048201529091505f906001600160a01b038616906370a082319060240160206040518083" +
  "0381865afa158015610207573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061022b91" +
  "906105f5565b604051630251596160e31b81523060048201528915156024820152604481018990526001600160a01b038881" +
  "16606483015260a060848301525f60a4830152919250908b169063128acb089060c40160408051808303815f875af1158015" +
  "610295573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906102b9919061060c565b5050" +
  "6040516370a0823160e01b81523060048201525f906001600160a01b038716906370a0823190602401602060405180830381" +
  "865afa1580156102ff573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610323919061" +
  "05f5565b6040516370a0823160e01b81523060048201529091505f906001600160a01b038c16906370a08231906024016020" +
  "60405180830381865afa15801561036a573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101" +
  "9061038e91906105f5565b905061039a838361062e565b95506103a6818561062e565b6001805460ff60a01b19169055959c" +
  "959b50949950505050505050505050565b5f546001600160a01b031633146104135760405162461bcd60e51b815260206004" +
  "82015260116024820152703ab732bc3832b1ba32b21031b0b63632b960791b60448201526064016100c5565b5f8085136104" +
  "215783610423565b845b90505f81136104635760405162461bcd60e51b815260206004820152600c60248201526b1b9bdd1a" +
  "1a5b99c81bddd95960a21b60448201526064016100c5565b6001545f5460405163a9059cbb60e01b81526001600160a01b03" +
  "91821660048201526024810184905291169063a9059cbb906044016020604051808303815f875af11580156104b4573d5f80" +
  "3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906104d89190610653565b505050505050565b60" +
  "01600160a01b03811681146104f4575f80fd5b50565b80151581146104f4575f80fd5b5f805f805f8060c087890312156105" +
  "19575f80fd5b8635610524816104e0565b95506020870135610534816104e0565b94506040870135610544816104f7565b93" +
  "5060608701359250608087013561055b816104e0565b915060a087013561056b816104e0565b809150509295509295509295" +
  "565b5f805f806060858703121561058c575f80fd5b8435935060208501359250604085013567ffffffffffffffff81111561" +
  "05b0575f80fd5b8501601f810187136105c0575f80fd5b803567ffffffffffffffff8111156105d6575f80fd5b8760208284" +
  "010111156105e7575f80fd5b949793965060200194505050565b5f60208284031215610605575f80fd5b5051919050565b5f" +
  "806040838503121561061d575f80fd5b505080516020909101519092909150565b8181038181111561064d57634e487b7160" +
  "e01b5f52601160045260245ffd5b92915050565b5f60208284031215610663575f80fd5b815161066e816104f7565b939250" +
  "505056fea264697066735822122064facd092912230b010b011aaa8d02ae302f58952f2cac0f3a816df463593c3f64736f6c" +
  "634300081a0033";

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
/* The two calls that actually identify a V3 pool and tell us whether it can trade right now.
   Raw selectors rather than ABI entries because slot0() returns seven packed fields we do not
   need — only whether it answers at all. */
const SLOT0_SELECTOR = "0x3850c7bd"; //     slot0()
const LIQUIDITY_SELECTOR = "0x1a686502"; // liquidity()
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

/* keccak256("Transfer(address,address,uint256)") — every ERC-20 emits it, and its `to` topic is a
   list of addresses that have held this token. Hardcoded rather than derived so this file does not
   have to import a hashing helper just to rebuild a constant. */
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
/* Deliberately small. This search replaces up to 42 storage probes, so it has to stay cheaper than
   what it replaces — and every extra call is one more chance to trip the public RPC's rate limiter,
   which surfaces as a failure that looks nothing like rate limiting. 20k blocks is ~35 minutes at
   chain 4663's 0.1s blocks and still returned ~880 Transfers for an ordinary token. */
const HOLDER_LOG_SPAN = 20_000n;
const HOLDER_CANDIDATES = 6;
/* A hard ceiling on the whole holder search. The public RPC's latency is wildly variable — the same
   query measured 4s and 30s minutes apart — and this runs inside a rug check that already sits
   inside a chat turn with a deadline. Better to give up on the nicer method quickly and fall back
   than to make every caller wait for it. Exceeding this is not an error and not a finding; it just
   means the synthetic path answers instead. */
const HOLDER_SEARCH_BUDGET_MS = 6_000;
/* Mint and burn both show up as Transfers to or from here, and neither is a holder. */
const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000");

/**
 * Find a real holder of `token` we can simulate a sell FROM, so the probe does not have to be
 * funded by guessing the token's storage layout.
 *
 * Returns { address, balance } or null. Never throws: a failure here is a fallback, not an error.
 */
async function findRealHolder(token, pool, wanted) {
  const deadline = Date.now() + HOLDER_SEARCH_BUDGET_MS;
  const outOfTime = () => Date.now() > deadline;
  const client = chainClient();

  let logs;
  try {
    const head = await client.getBlockNumber();
    const from = head > HOLDER_LOG_SPAN ? head - HOLDER_LOG_SPAN : 0n;
    logs = await client.getLogs({ address: token, fromBlock: from, toBlock: "latest" });
  } catch {
    return null; // no log index, or the range was refused — fall back to the storage probe
  }
  if (outOfTime()) return null;

  const seen = new Set();
  const candidates = [];
  /* Newest first: a recent recipient is far likelier to still hold the tokens than an address that
     received them at the start of the window and has had hours to sell. */
  for (let i = logs.length - 1; i >= 0 && candidates.length < HOLDER_CANDIDATES; i -= 1) {
    const log = logs[i];
    if (log.topics?.[0] !== TRANSFER_TOPIC || !log.topics[2]) continue;
    const to = getAddress(`0x${log.topics[2].slice(26)}`);
    /* The pool is excluded deliberately. It is always the largest holder, and selling the pool's
       own inventory back into itself is not the trade any user is asking about. */
    if (to === pool || to === ZERO_ADDRESS || seen.has(to)) continue;
    seen.add(to);
    candidates.push(to);
  }
  if (!candidates.length) return null;

  /* One at a time, and stop as soon as a good enough holder turns up. Firing a dozen calls at once
     is how a public RPC starts refusing them, and a refusal here used to be reported as "this node
     cannot do state overrides" — a wrong reason attached to a real failure. */
  const usable = [];
  for (const address of candidates) {
    if (outOfTime()) break;
    try {
      const balance = BigInt(
        (await client.call({ to: token, data: encodeFunctionData({ abi: BALANCE_OF, functionName: "balanceOf", args: [address] }) }))?.data || "0x0"
      );
      if (balance === 0n) continue;
      /* Prefer a plain account. Replacing a live contract's code with the probe would also replace
         whatever made it a holder, and some of those contracts are the very routers and hooks the
         swap is about to call. */
      const code = await client.getBytecode({ address });
      const entry = { address, balance, isContract: Boolean(code && code !== "0x") };
      usable.push(entry);
      if (!entry.isContract && balance >= wanted) return entry; // good enough; stop paying for more
    } catch {
      // this candidate is unusable; the next one may not be
    }
  }
  if (!usable.length) return null;

  const rank = (entry) => {
    const enough = entry.balance >= wanted ? 1 : 0;
    const plain = entry.isContract ? 0 : 1;
    return plain * 2 + enough; // a plain account with enough beats everything else
  };
  usable.sort((a, b) => rank(b) - rank(a) || (b.balance > a.balance ? 1 : -1));
  return usable[0];
}

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
export async function simulateExit(rawAddress, marketOverride = null) {
  if (!isAddress(rawAddress)) return { ok: false, error: "That is not a valid EVM address." };
  const token = getAddress(rawAddress);

  const market = marketOverride || (await getMarket(token));
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
  let activeLiquidity;
  try {
    const client = chainClient();
    /* token0()/token1() are NOT a V3 fingerprint — V2 pairs and most other AMMs answer them too,
       and driving a non-V3 pool with V3's swap() signature just reverts. Read at the same time as
       the thing that IS specific to V3, so a pool that merely looks pair-shaped cannot get as far
       as the probe. Measured on chain 4663: two pools DexScreener reports as "uniswap" answer
       token0()/token1() and revert on both slot0() and liquidity(), and before this check they
       were reported as CANNOT-EXIT — an accusation earned by not being a V3 pool. */
    const [t0, t1, dec, slot0, liquidity] = await Promise.all([
      client.call({ to: pool, data: encodeFunctionData({ abi: POOL_TOKENS, functionName: "token0", args: [] }) }),
      client.call({ to: pool, data: encodeFunctionData({ abi: POOL_TOKENS, functionName: "token1", args: [] }) }),
      client.call({ to: token, data: encodeFunctionData({ abi: DECIMALS, functionName: "decimals", args: [] }) }),
      client.call({ to: pool, data: SLOT0_SELECTOR }),
      client.call({ to: pool, data: LIQUIDITY_SELECTOR }),
    ]);
    if (!slot0?.data || slot0.data === "0x") throw new Error("notV3");
    token0 = getAddress(`0x${String(t0?.data || "").slice(26, 66)}`);
    token1 = getAddress(`0x${String(t1?.data || "").slice(26, 66)}`);
    decimals = Number(BigInt(dec?.data || "0x12"));
    activeLiquidity = BigInt(liquidity?.data || "0x0");
  } catch {
    /* A pair that does not answer slot0() is not a V3 pool we can drive. Some other pool type may
       well be perfectly sellable; we simply cannot prove it from here. */
    return unknownExit(
      "The pool does not expose the Uniswap V3 interface, so an exit cannot be simulated from here. " +
        "That is a limit of this simulation, not a finding against the token. UNKNOWN, not PASS."
    );
  }

  /* Zero active liquidity means the swap would move nothing, the callback would be owed nothing,
     and the probe's own `require(owed > 0)` would revert — which the catch below would have
     reported as CANNOT-EXIT. "There is nothing in range to sell into" is a fact about the pool's
     current tick, not evidence that the token traps sellers, and the two must not share a verdict.
     Measured on chain 4663: a token with $14k of reported liquidity and liquidity() == 0. */
  if (activeLiquidity === 0n) {
    return unknownExit(
      "The pool reports no active liquidity at the current price, so there is nothing to sell into " +
        "and the swap cannot be simulated. That is a fact about the pool right now, not evidence " +
        "against the token. UNKNOWN, not PASS."
    );
  }

  if (token0 !== token && token1 !== token) {
    return unknownExit("The pool does not hold this token, so an exit through it cannot be simulated. UNKNOWN, not PASS.");
  }
  const zeroForOne = token0 === token;
  const counterToken = zeroForOne ? token1 : token0;
  const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n;

  /* decimals() is read from the token, so a deployer picks it, and it is about to become an
     EXPONENT. Left unbounded it is an injection point rather than a field:
       - at 78 and above, 10**decimals exceeds uint256 and viem refuses to encode it. That throw
         lands in the catch below, which reports CANNOT-EXIT — so a token could earn the harshest
         verdict this tool has by declaring a number, with no honeypot anywhere. Reproduced in
         tests/buggloExitProbe.test.js.
       - at 77 it still encodes but passes int256.max, and Solidity's int256(uint256) cast is
         unchecked, so it wraps negative and V3 reads a negative amountSpecified as exact-OUTPUT.
         The probe would answer a different question and look like it worked.
     Real ERC-20s live at 6, 8 or 18; 36 is already absurd and leaves room for the genuinely odd.
     Outside that, the honest answer is that we did not run the check. */
  const MAX_SANE_DECIMALS = 36;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_SANE_DECIMALS) {
    return unknownExit(
      `The token reports ${decimals} decimals, which is outside the range this simulation can size a ` +
        "trade in. That is a fact about its metadata, not evidence about selling — UNKNOWN, not PASS, " +
        "and not a finding against the token."
    );
  }

  /* One whole token. Sized in units rather than as a share of supply, because a fixed fraction of a
     large supply is enough to move the price on a thin pool, and a swap that fails only because it
     was too big for the liquidity is a fact about the pool, not about the token. */
  const wholeToken = 10n ** BigInt(decimals);

  /* WHERE THE TOKENS COME FROM — the part that decides how much of the chain this can answer for.
   *
   * The original approach funds a synthetic address by overriding the token's balance storage,
   * which means first FINDING that storage. That works for mainstream ERC-20s and fails completely
   * for anything else: measured on chain 4663, an entire launchpad family (44-byte EIP-1167 proxies
   * onto one implementation, carrying millions in liquidity) has balances that are not in the first
   * 200 integer slots, nor under any ERC-7201 namespace tried, nor under Solady's layout. For those
   * the simulation could never run at all.
   *
   * So: prefer a REAL holder, and inject the probe's code at THEIR address. Their balance is
   * already there, so no storage override is needed and no layout has to be guessed. Two things
   * come free with that:
   *   - every token becomes reachable, whatever its storage looks like;
   *   - the seller has real history, so a token or hook that gates on holder age, an allowlist, or
   *     prior activity is tested as it would actually behave, instead of waving through a
   *     freshly-minted synthetic address it has never seen.
   * Overriding code at an address changes nothing on chain and cannot touch the holder's funds;
   * this is still one read-only eth_call. */
  const holder = await findRealHolder(token, pool, wholeToken);

  let amountIn = wholeToken;
  const overrides = [];
  if (holder) {
    /* Never ask for more than they have. A revert caused by the probe running out of its own
       tokens would be indistinguishable from the token blocking the sell, which is the one
       confusion this whole file exists to prevent. */
    amountIn = holder.balance < wholeToken ? holder.balance : wholeToken;
    overrides.push({ address: holder.address, code: EXIT_PROBE_RUNTIME });
  } else {
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
      return unknownExit(
        "No holder could be found to simulate a sell from, and the token's balance storage layout " +
          "could not be located either, so a funded exit could not be simulated. That is a limit of " +
          "this simulation, not a finding against the token. UNKNOWN, not PASS."
      );
    }
    overrides.push(
      { address: EXIT_PROBE, code: EXIT_PROBE_RUNTIME },
      { address: token, stateDiff: [{ slot, value: toBytes32(wholeToken * 2n) }] }
    );
  }
  const seller = holder ? holder.address : EXIT_PROBE;

  let raw;
  try {
    const result = await chainClient().call({
      to: seller,
      data: encodeFunctionData({
        abi: PROBE_EXIT,
        functionName: "probeExit",
        args: [pool, token, zeroForOne, amountIn, sqrtPriceLimitX96, counterToken],
      }),
      stateOverride: overrides,
    });
    raw = result?.data ?? "0x";
  } catch (error) {
    return {
      ok: true,
      status: "CANNOT-EXIT",
      exits: false,
      received: null,
      note:
        `${holder ? "A real holder of this token" : "A funded synthetic holder"} could not complete a sell through the pool: the swap reverted. ` + +
        "That is what a blocked transfer, a sell tax the pool will not accept, or a pool that takes " +
        "the tokens and refuses to pay all look like from here. It is a hard signal against exiting.",
      evidence: { pool, seller, amountIn: amountIn.toString(), reason: String(error?.shortMessage || error?.message || error).slice(0, 140) },
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
      evidence: { pool, seller, amountIn: amountIn.toString(), paid: paid.toString() },
    };
  }

  return {
    ok: true,
    status: "EXIT-CLEARS",
    exits: true,
    received: received.toString(),
    note:
      `${holder ? "A real holder of this token" : "A funded synthetic holder"} completed a full sell through the pool and received value back, at ` +
      "this block and at this size. That is the strongest read-only evidence of sellability there is — " +
      "it is not a promise: an owner can change the rules in the next transaction, and a token that " +
      "gates on the holder's address may treat a real wallet differently.",
    evidence: { pool, seller, counterToken, amountIn: amountIn.toString(), paid: paid.toString(), from: holder ? "real-holder" : "synthetic" },
  };
}
