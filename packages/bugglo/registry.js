/* Robinhood Chain (4663) official Stock-Token registry — the ground truth for "is this the REAL
 * tokenized stock, or an impostor?". The chain is permissionless, so anyone can mint an ERC-20 named
 * "AAPL" with the right symbol and 18 decimals. The only defence is the issuer's own published list
 * of canonical addresses (docs.robinhood.com/chain/contracts). This pins a snapshot of it.
 *
 * THE HONESTY RULE THAT GOVERNS THIS FILE — because a registry is exactly where overclaiming hides.
 *
 * This snapshot is PARTIAL and VERSIONED. An address that is not in it is NOT proven to be an
 * impostor — it may be a real listing we have not pinned yet, or an ordinary non-RWA token. So the
 * only strong verdict we ever emit from here is the two we can actually stand behind:
 *
 *   OFFICIAL          the address is byte-for-byte one on the pinned issuer list. High confidence.
 *   IMPOSTOR-SUSPECT  a DIFFERENT address is presenting a ticker/name that a pinned official token
 *                     owns (e.g. symbol "AAPL" at an address that is not the real AAPL). This is the
 *                     collision that catches fakes, and it is only ever a SUSPECT — the strong word
 *                     is "this is not the official one", not "this is a scam".
 *
 * Everything else is NOT-IN-REGISTRY (an honest "I have no official record of this"), never a pass
 * and never an accusation. As the registry fills out, the collision net widens; it never guesses.
 *
 * SOURCE: addresses below were surfaced from the issuer docs during research (July 2026). Each is
 * marked `verified` only when we cross-checked the exact address. Extend `OFFICIAL_TOKENS` from the
 * canonical page; keep `verified:false` for any entry pinned from a secondary source until confirmed.
 */

import { getAddress, isAddress } from "viem";

/* ticker → { name, address, verified }. Partial by design — see the header. */
const OFFICIAL_TOKENS_RAW = [
  { ticker: "TSLA", name: "Tesla", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", verified: true },
  { ticker: "NVDA", name: "Nvidia", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", verified: true },
  { ticker: "AAPL", name: "Apple", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", verified: true },
];

export const REGISTRY_META = {
  chain: "Robinhood Chain",
  chainId: 4663,
  source: "docs.robinhood.com/chain/contracts",
  snapshotDate: "2026-07-22",
  partial: true,
  count: OFFICIAL_TOKENS_RAW.length,
  note: "Partial snapshot. Absence from this list is NOT proof of an impostor — only a match (OFFICIAL) or a ticker/name collision at a different address (IMPOSTOR-SUSPECT) is a strong signal.",
};

/* Normalised lookups, built once. */
const BY_ADDRESS = new Map();
const BY_TICKER = new Map();
for (const t of OFFICIAL_TOKENS_RAW) {
  const entry = { ...t, address: getAddress(t.address) };
  BY_ADDRESS.set(entry.address.toLowerCase(), entry);
  BY_TICKER.set(entry.ticker.toUpperCase(), entry);
}

export function officialList() {
  return OFFICIAL_TOKENS_RAW.map((t) => ({ ...t, address: getAddress(t.address) }));
}

/** The one canonical address for a ticker, or null if not in the pinned list. */
export function officialAddressFor(ticker) {
  const hit = BY_TICKER.get(String(ticker || "").trim().toUpperCase());
  return hit ? hit.address : null;
}

/**
 * Verify an address against the official registry, using the token's on-chain symbol/name to catch
 * impostors that copy a ticker.
 *
 * @param rawAddress  the address being checked
 * @param metadata    { symbol, name } already read from chain (pass what rugCheck/getTokenMetadata got)
 * → { status, matched, note }
 *     status: "OFFICIAL" | "IMPOSTOR-SUSPECT" | "NOT-IN-REGISTRY"
 */
export function verifyAgainstRegistry(rawAddress, metadata = {}) {
  if (!isAddress(rawAddress)) {
    return { status: "NOT-IN-REGISTRY", matched: null, note: "Not a valid address." };
  }
  const address = getAddress(rawAddress);

  const official = BY_ADDRESS.get(address.toLowerCase());
  if (official) {
    return {
      status: "OFFICIAL",
      matched: { ticker: official.ticker, name: official.name, address: official.address },
      note: `This is the official ${official.name} (${official.ticker}) token on the pinned Robinhood Chain issuer list.`,
    };
  }

  /* No address match. Does it WEAR a ticker/name that a pinned official token owns? That is the
     impostor fingerprint: right badge, wrong address. */
  const symbol = String(metadata.symbol || "").trim().toUpperCase();
  const name = String(metadata.name || "").trim().toUpperCase();

  let collision = symbol && BY_TICKER.get(symbol);
  if (!collision && name) {
    for (const entry of BY_TICKER.values()) {
      if (entry.name.toUpperCase() === name) { collision = entry; break; }
    }
  }

  if (collision) {
    return {
      status: "IMPOSTOR-SUSPECT",
      matched: { ticker: collision.ticker, name: collision.name, officialAddress: collision.address },
      note:
        `This token presents as "${metadata.symbol || metadata.name}", but the official ${collision.name} ` +
        `(${collision.ticker}) is at ${collision.address}, NOT this address. Treat this as an impostor until proven otherwise.`,
    };
  }

  return {
    status: "NOT-IN-REGISTRY",
    matched: null,
    note:
      "No official record of this address, and its ticker does not collide with a pinned official token. " +
      "That is not a red flag and not a pass — the registry is partial, so this simply is not a known tokenized stock.",
  };
}
