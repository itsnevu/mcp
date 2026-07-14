/* First-party Robinhood Chain data. The ONLY thing in this app that reads the chain directly.
 *
 * WHY THIS EXISTS — read before changing anything.
 *
 * Asked to rug-check a real Robinhood Chain token that had bytecode, supply, and live liquidity,
 * the MCP-tool agent
 * answered: "not a token contract — an empty wallet with no code and zero balance", and said
 * it had checked "Robinhood Chain (Mezo)". Mezo is a different chain.
 *
 * Every one of those statements was false, and the agent had no way to know: the general-purpose
 * MCP servers it reached for default to Ethereum (some only ever cover Ethereum/BSC/Base), and
 * a "no contract here" from the wrong chain is indistinguishable, to the model, from a real
 * finding. A user reading that would conclude a real token was a phantom.
 *
 * A tool that can silently answer about the wrong chain is worse than no tool. So this module
 * talks to Robinhood Chain (id 4663) and NOTHING ELSE, it is a first-party tool wired straight
 * into the agent loop (not via MCP, so it survives the whole fleet being down), and it reports
 * UNKNOWN — loudly, as a first-class outcome — for anything it cannot actually measure.
 *
 * THE RULE: "unknown" and "safe" are different words. A check that did not run is never a check
 * that passed. Every helper here returns evidence or it returns null; it never returns a guess.
 */

import { createPublicClient, http, defineChain, getAddress, isAddress } from "viem";

export const ROBINHOOD_CHAIN_ID = 4663;

/* The chain's own RPC. Overridable, because a public RPC is a single point of failure and the
   day it rate-limits us we want to repoint it without a deploy — not because the default is in
   any doubt (chainid.network lists exactly this endpoint for chain 4663). */
export const RPC_URL = process.env.ROBINX_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

const RPC_TIMEOUT_MS = Number(process.env.CHAIN_RPC_TIMEOUT_MS) || 10_000;
const DEX_TIMEOUT_MS = Number(process.env.CHAIN_DEX_TIMEOUT_MS) || 8_000;

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

let client;
export function chainClient() {
  if (!client) {
    client = createPublicClient({
      chain: robinhoodChain,
      transport: http(RPC_URL, {
        timeout: RPC_TIMEOUT_MS,
        retryCount: 1, // one retry; a rug check must not hang a chat turn behind an exponential backoff
        batch: true, // coalesce the metadata reads into one JSON-RPC batch round-trip
      }),
    });
  }
  return client;
}

/* Only what we actually call. A wide ABI invites the temptation to call things we have not
   thought about the failure modes of. */
const ERC20_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
];

const OWNER_ABI = [
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

const ZERO = "0x0000000000000000000000000000000000000000";
const DEAD = "0x000000000000000000000000000000000000dEaD";

/* EIP-1967 implementation slot. A proxy means the code you audited today can be swapped for
   different code tomorrow — which is not itself a scam, but it IS a fact the holder must be
   told, because every other check on this page describes code that can be replaced at will. */
const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

/* Function selectors whose PRESENCE IN THE BYTECODE means the contract can do the thing. We
   scan the code rather than call them, because calling proves nothing (a mint() that reverts
   for us still mints for the owner) and because a scanned selector cannot be faked away.
   NOTE what this list is NOT: it is not a verdict. Plenty of honest tokens are mintable or
   pausable. It is a disclosure of powers, and it is presented to the user as exactly that. */
const POWER_SELECTORS = {
  "40c10f19": "mint(address,uint256)",
  "a0712d68": "mint(uint256)",
  "8456cb59": "pause()",
  "3f4ba83a": "unpause()",
  "f2fde38b": "transferOwnership(address)",
  "715018a6": "renounceOwnership()",
  "0e316ab7": "blacklist(address)",
  "f9f92be4": "blacklist(address)",
  "44337ea1": "addBlackList(address)",
  "e4997dc5": "removeBlackList(address)",
  "8a8c523c": "enableTrading()",
  "751039fc": "removeLimits()",
  "c0246668": "excludeFromFees(address,bool)",
  "4a62bb65": "setLimitsEnabled(bool)",
  "9a7a23d6": "setAutomatedMarketMakerPair(address,bool)",
};

/* Wraps a chain read so that a FAILURE IS NEVER A RESULT. Every caller gets {ok, value} or
   {ok:false, error} and must decide what an error means — which is the whole point: the old
   behaviour was a tool erroring and the model rendering that silence as "check passed". */
async function attempt(label, fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    const message = String(error?.shortMessage || error?.message || error).slice(0, 200);
    return { ok: false, error: `${label}: ${message}` };
  }
}

/**
 * Is there code at this address on ROBINHOOD CHAIN?
 * The check whose absence produced "it's an empty wallet" about a 9.6KB contract.
 * → { ok, value: { isContract, size } }
 */
export async function getContractCode(address) {
  return attempt("eth_getCode", async () => {
    const code = await chainClient().getCode({ address });
    // viem returns undefined (not "0x") for an EOA on some nodes. Treat both as "no code".
    const hex = code && code !== "0x" ? code : null;
    return { isContract: Boolean(hex), size: hex ? (hex.length - 2) / 2 : 0, bytecode: hex };
  });
}

/** ERC-20 metadata, batched into one round-trip. A revert here means "not a standard ERC-20". */
export async function getTokenMetadata(address) {
  const c = chainClient();
  const reads = ["name", "symbol", "decimals", "totalSupply"].map((functionName) =>
    attempt(functionName, () => c.readContract({ address, abi: ERC20_ABI, functionName }))
  );
  const [name, symbol, decimals, totalSupply] = await Promise.all(reads);

  return {
    /* Each field independently ok/failed. A token with a bytes32 symbol (older style) reverts on
       symbol() but is still a real token — so one failed field must not condemn the whole read. */
    name: name.ok ? String(name.value) : null,
    symbol: symbol.ok ? String(symbol.value) : null,
    decimals: decimals.ok ? Number(decimals.value) : null,
    totalSupply: totalSupply.ok ? totalSupply.value.toString() : null,
    isErc20: symbol.ok || name.ok || decimals.ok, // any of them answering means it speaks ERC-20
    errors: [name, symbol, decimals, totalSupply].filter((r) => !r.ok).map((r) => r.error),
  };
}

/**
 * Ownership. Three genuinely different outcomes, and collapsing any two of them is a lie:
 *   - renounced   : owner() === 0x0 / 0xdead. Nobody can call the owner-only functions.
 *   - owned       : owner() is a live address. That address holds whatever powers exist.
 *   - no-owner-fn : owner() reverts. There is no Ownable owner. This is NOT "renounced" and it
 *                   is NOT "owned" — the contract may still have privileged roles under another
 *                   name (AccessControl, an embedded admin). We cannot see them, so we say so.
 */
export async function getOwnership(address) {
  const result = await attempt("owner()", () =>
    chainClient().readContract({ address, abi: OWNER_ABI, functionName: "owner" })
  );

  if (!result.ok) return { state: "no-owner-fn", owner: null, note: result.error };

  const owner = String(result.value);
  const burned = owner.toLowerCase() === ZERO.toLowerCase() || owner.toLowerCase() === DEAD.toLowerCase();
  return { state: burned ? "renounced" : "owned", owner, note: null };
}

/** Is this a proxy? If so, today's bytecode is not a promise about tomorrow's. */
export async function getProxyStatus(address) {
  const result = await attempt("eip1967-slot", () =>
    chainClient().getStorageAt({ address, slot: EIP1967_IMPL_SLOT })
  );
  if (!result.ok) return { isProxy: null, implementation: null, note: result.error };

  const slot = result.value;
  if (!slot || /^0x0*$/.test(slot)) return { isProxy: false, implementation: null, note: null };

  const impl = getAddress(`0x${slot.slice(-40)}`);
  return { isProxy: true, implementation: impl, note: null };
}

/** Which privileged powers exist in the bytecode. A disclosure, never a verdict. */
export function scanPowers(bytecode) {
  if (!bytecode) return null;
  const code = bytecode.toLowerCase();
  const found = [];
  for (const [selector, signature] of Object.entries(POWER_SELECTORS)) {
    if (code.includes(selector) && !found.includes(signature)) found.push(signature);
  }
  return found;
}

/* ── Market side ────────────────────────────────────────────────────────────────────────────
   The RPC knows the code; it does not know whether anyone can SELL. That lives on the DEX. */

async function dexPairs(address) {
  const url = `https://api.dexscreener.com/token-pairs/v1/robinhood/${address}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(DEX_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`dexscreener → HTTP ${res.status}`);
  const json = await res.json();
  const pairs = Array.isArray(json) ? json : json?.pairs || [];
  // Belt and braces: the endpoint is chain-scoped, but never trust a chain field you did not check.
  return pairs.filter((p) => p?.chainId === "robinhood");
}

/**
 * Liquidity, age, and the sell side.
 *
 * The honeypot signal is buys-with-no-sells — but a brand-new honest launch ALSO has no sells in
 * its first minutes, and shouting "HONEYPOT" at one would be a libel-grade false positive. So a
 * zero-sell reading is only allowed to mean anything once there are enough real buys behind
 * it (MIN_BUYS), and even then it is reported as "nobody has sold", not as "you cannot sell".
 *
 * The only thing that proves you cannot sell is a sell simulation: an eth_call against the router
 * from a holder's position, with state overrides for balance and allowance. eth_call is read-only —
 * it changes no state and needs no key — so this IS buildable from here. We have not built it.
 * That is why UNMEASURABLE.honeypotSimulation says "Not run" and not "cannot run": reading our own
 * unbuilt work as an impossibility would launder ignorance into a clean excuse, which is the exact
 * move this file exists to refuse.
 */
const MIN_BUYS_FOR_SELL_SIGNAL = 30;

export async function getMarket(address) {
  const result = await attempt("dexscreener", () => dexPairs(address));
  if (!result.ok) return { ok: false, error: result.error };

  const pairs = result.value;
  if (!pairs.length) {
    /* No pool is not a red flag and it is not a green one. It is a token you cannot buy or sell
       on a DEX yet. Saying "low risk" about it because no market check failed would be absurd. */
    return { ok: true, hasMarket: false, pairs: 0 };
  }

  const deepest = pairs.reduce((best, p) =>
    Number(p?.liquidity?.usd || 0) > Number(best?.liquidity?.usd || 0) ? p : best
  );

  const liquidityUsd = Number(deepest?.liquidity?.usd || 0);
  const fdv = Number(deepest?.fdv || 0);
  const volume24h = Number(deepest?.volume?.h24 || 0);
  const buys = Number(deepest?.txns?.h24?.buys || 0);
  const sells = Number(deepest?.txns?.h24?.sells || 0);
  const createdAt = Number(deepest?.pairCreatedAt || 0) || null;

  return {
    ok: true,
    hasMarket: true,
    pairs: pairs.length,
    dexId: deepest?.dexId || null,
    pairAddress: deepest?.pairAddress || null,
    priceUsd: deepest?.priceUsd || null,
    liquidityUsd,
    fdv: fdv || null,
    volume24h,
    buys24h: buys,
    sells24h: sells,
    ageMs: createdAt ? Date.now() - createdAt : null,
    /* Only a meaningful reading when the buy set is large enough to make "and yet nobody sold"
       surprising. Below that it is null — genuinely unknown — not false. */
    nobodyHasSold: buys >= MIN_BUYS_FOR_SELL_SIGNAL && sells === 0 ? true : buys >= MIN_BUYS_FOR_SELL_SIGNAL ? false : null,
    /* Volume many times the pool's own depth, on a young pair, is the wash-trading fingerprint.
       Reported as a ratio, not a verdict — a genuinely hot token also churns its pool. */
    volumeToLiquidity: liquidityUsd > 0 ? Number((volume24h / liquidityUsd).toFixed(1)) : null,
    /* A large valuation standing on a shallow pool is an exit that cannot be taken at that price. */
    fdvToLiquidity: liquidityUsd > 0 && fdv > 0 ? Number((fdv / liquidityUsd).toFixed(1)) : null,
  };
}

/* ── What we deliberately DO NOT claim ──────────────────────────────────────────────────────
   Holder concentration and LP-lock status are the two things users most want, and neither is
   obtainable from a bare RPC at chat latency. Reconstructing balances would mean eth_getLogs
   over the token's whole Transfer history — unbounded, and public RPCs cap log ranges anyway.
   There is no indexer for this chain wired up.

   So we do not ship a guess. rugCheck() returns them as UNKNOWN with the reason, and the agent
   is required to say so. Older builds printed precise holder and lock claims that were never
   measured, on a screen someone might bet money on.
   An honest "I can't see this" is worth more than a confident fabrication, and it is the whole
   reason this file exists. */
export const UNMEASURABLE = {
  holderConcentration:
    "Holder distribution needs an indexer. Reconstructing it from Transfer logs is not possible at chat latency on a public RPC, and no indexer covers this chain yet.",
  liquidityLock:
    "LP-lock status needs to be resolved against a known locker registry. There is no locker registry for this chain yet, so a locked pool and an unlocked one look identical from here.",
  honeypotSimulation:
    "Proving a sell would go through needs a simulated sell (eth_call against the router from a holder). Not run — so a passing market check is not proof that you can exit.",
};

/**
 * The orchestrator. Every signal is PASS / FAIL / WARN / UNKNOWN with the evidence behind it.
 * There is deliberately NO numeric risk score: a score computed from four measured signals and
 * three unknowns is a number that launders ignorance into false confidence, and that number is
 * exactly the kind of output this checker exists to prevent.
 *
 * → { address, chain, checked, verdict, signals[], unmeasured[], errors[] }
 */
export async function rugCheck(rawAddress) {
  if (!isAddress(rawAddress)) {
    return { ok: false, error: "That is not a valid EVM address (expected 0x + 40 hex characters)." };
  }
  const address = getAddress(rawAddress);

  const [codeResult, market] = await Promise.all([getContractCode(address), getMarket(address)]);

  const signals = [];
  const errors = [];

  if (!codeResult.ok) {
    /* We could not reach the chain. This is the case that MUST NOT silently become a verdict —
       it is the exact shape of the bug that started all this. Refuse to conclude. */
    errors.push(codeResult.error);
    return {
      ok: true,
      address,
      chain: "Robinhood Chain",
      verdict: "CANNOT CHECK",
      summary:
        "I could not reach Robinhood Chain to inspect this contract, so I have no findings — not good ones and not bad ones. I will not guess.",
      signals: [],
      unmeasured: Object.entries(UNMEASURABLE).map(([key, why]) => ({ key, why })),
      errors,
    };
  }

  const { isContract, size, bytecode } = codeResult.value;

  if (!isContract) {
    return {
      ok: true,
      address,
      chain: "Robinhood Chain",
      verdict: "NOT A CONTRACT",
      summary:
        "There is no code at this address on Robinhood Chain — it is a wallet (EOA), not a token. There is nothing here to rug-check. If you expected a token, the address may belong to a different chain.",
      signals: [],
      unmeasured: [],
      errors,
    };
  }

  signals.push({
    key: "is-contract",
    status: "PASS",
    label: "Contract exists",
    detail: `${size.toLocaleString()} bytes of bytecode on Robinhood Chain (chain ${ROBINHOOD_CHAIN_ID}).`,
  });

  const [metadata, ownership, proxy] = await Promise.all([
    getTokenMetadata(address),
    getOwnership(address),
    getProxyStatus(address),
  ]);
  errors.push(...(metadata.errors || []));

  signals.push({
    key: "erc20",
    status: metadata.isErc20 ? "PASS" : "WARN",
    label: "ERC-20 interface",
    detail: metadata.isErc20
      ? `${metadata.name || "?"} (${metadata.symbol || "?"}), ${metadata.decimals ?? "?"} decimals.`
      : "The contract did not answer the standard ERC-20 calls. It may not be a token.",
  });

  signals.push(
    ownership.state === "renounced"
      ? {
          key: "ownership",
          status: "PASS",
          label: "Ownership renounced",
          detail: `owner() is ${ownership.owner} — the owner-only functions can no longer be called by anyone.`,
        }
      : ownership.state === "owned"
        ? {
            key: "ownership",
            status: "WARN",
            label: "Ownership active",
            detail: `owner() is ${ownership.owner}. That address can still call whatever owner-only functions this contract has.`,
          }
        : {
            key: "ownership",
            status: "UNKNOWN",
            label: "Ownership unclear",
            detail:
              "There is no standard owner() function. That does NOT mean ownership is renounced — the contract may use roles or an embedded admin that I cannot see from here.",
          }
  );

  const powers = scanPowers(bytecode);
  if (powers && powers.length) {
    signals.push({
      key: "powers",
      status: "WARN",
      label: "Privileged functions present",
      detail: `The bytecode contains: ${powers.join(", ")}. Plenty of legitimate tokens have these — but whoever holds the keys can use them.`,
    });
  } else {
    signals.push({
      key: "powers",
      status: "PASS",
      label: "No common privileged functions",
      detail: "I did not find mint, pause, or blacklist selectors in the bytecode.",
    });
  }

  if (proxy.isProxy === true) {
    signals.push({
      key: "proxy",
      status: "WARN",
      label: "Upgradeable proxy",
      detail: `This is a proxy (implementation ${proxy.implementation}). Everything above describes the CURRENT code, which the admin can replace.`,
    });
  } else if (proxy.isProxy === false) {
    signals.push({
      key: "proxy",
      status: "PASS",
      label: "Not an upgradeable proxy",
      detail: "No EIP-1967 implementation slot — the code cannot be swapped out from under you.",
    });
  }

  if (!market.ok) {
    errors.push(market.error);
    signals.push({
      key: "market",
      status: "UNKNOWN",
      label: "Market data unavailable",
      detail: "I could not reach the DEX data source, so I know nothing about liquidity, volume or whether anyone has sold.",
    });
  } else if (!market.hasMarket) {
    signals.push({
      key: "market",
      status: "WARN",
      label: "No DEX pool",
      detail: "This token has no liquidity pool I can find on Robinhood Chain. You cannot buy or sell it on a DEX right now.",
    });
  } else {
    const ageHours = market.ageMs ? Math.floor(market.ageMs / 3_600_000) : null;
    signals.push({
      key: "liquidity",
      status: market.liquidityUsd >= 10_000 ? "PASS" : "WARN",
      label: "Liquidity",
      detail: `$${Math.round(market.liquidityUsd).toLocaleString()} in the deepest pool (${market.dexId || "dex"}${
        ageHours !== null ? `, pool is ${ageHours < 48 ? `${ageHours}h` : `${Math.floor(ageHours / 24)}d`} old` : ""
      }).${market.liquidityUsd < 10_000 ? " A shallow pool means a small sell moves the price a long way." : ""}`,
    });

    signals.push(
      market.nobodyHasSold === true
        ? {
            key: "sells",
            status: "WARN",
            label: "No sells in 24h",
            detail: `${market.buys24h} buys and zero sells. That is the shape a honeypot makes — but it is also what a token nobody wants to sell yet looks like. I cannot simulate a sell, so I cannot tell you which this is.`,
          }
        : market.nobodyHasSold === false
          ? {
              key: "sells",
              status: "PASS",
              label: "Sells are going through",
              detail: `${market.sells24h} sells against ${market.buys24h} buys in 24h — people are getting out, so it is not a hard honeypot.`,
            }
          : {
              key: "sells",
              status: "UNKNOWN",
              label: "Not enough trades to judge",
              detail: `Only ${market.buys24h} buys and ${market.sells24h} sells in 24h — too few to read anything into.`,
            }
    );

    if (market.fdvToLiquidity && market.fdvToLiquidity > 50) {
      signals.push({
        key: "fdv",
        status: "WARN",
        label: "Valuation far above liquidity",
        detail: `Fully-diluted valuation is ${market.fdvToLiquidity}× the pool depth. That price only exists on paper — the pool cannot pay it out.`,
      });
    }
  }

  /* THE VERDICT RULE. A risk level is only allowed when the checks that could actually fail have
     actually run. Otherwise the honest word is INSUFFICIENT DATA — and it is a first-class result
     here, not a footnote, because "no red flags found" after two of seven checks is a sentence
     that gets people robbed. */
  const failed = signals.filter((s) => s.status === "FAIL").length;
  const warned = signals.filter((s) => s.status === "WARN").length;
  const unknown = signals.filter((s) => s.status === "UNKNOWN").length;

  const verdict =
    failed > 0
      ? "HIGH RISK"
      : unknown >= 2
        ? "INSUFFICIENT DATA"
        : warned >= 2
          ? "CAUTION"
          : warned === 1
            ? "MIXED"
            : "NO RED FLAGS IN WHAT I COULD CHECK";

  return {
    ok: true,
    address,
    chain: "Robinhood Chain",
    chainId: ROBINHOOD_CHAIN_ID,
    token: metadata.isErc20 ? { name: metadata.name, symbol: metadata.symbol, decimals: metadata.decimals, totalSupply: metadata.totalSupply } : null,
    verdict,
    signals,
    /* Shipped on EVERY result, passed or failed. The user must always be able to see the shape of
       the hole — which checks this verdict does NOT cover. */
    unmeasured: Object.entries(UNMEASURABLE).map(([key, why]) => ({ key, why })),
    errors,
  };
}
