"use client";

/* MetaMask and Phantom both want window.ethereum, and whichever one the user set as their
   default wallet wins that slot — while still reporting isMetaMask: true (that is what
   Phantom parks there; isPhantom is undefined on it). So a button that names one wallet
   cannot read window.ethereum and hope. Order of trust:
     1. EIP-6963 rdns — the only unambiguous signal when both extensions are installed.
     2. window.phantom.ethereum — a namespace nothing but Phantom writes to.
     3. window.ethereum heuristics — only when EIP-6963 announced nothing at all. */

export const WALLETS = {
  metamask: {
    /* io.metamask, io.metamask.flask, io.metamask.mmi — but not a squatter's io.metamaskx. */
    rdnsMatch: (rdns) => rdns === "io.metamask" || rdns.startsWith("io.metamask."),
    install: "https://metamask.io/download",
    deepLink: () =>
      `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`,
  },
  phantom: {
    rdnsMatch: (rdns) => rdns === "app.phantom",
    install: "https://phantom.com/download",
    deepLink: () =>
      `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}?ref=${encodeURIComponent(window.location.origin)}`,
  },
};

const announced = new Map();
let listening = false;

function record(event) {
  const detail = event?.detail;
  if (!detail?.info?.rdns || typeof detail?.provider?.request !== "function") return;
  announced.set(detail.info.rdns, detail);
}

/* Called on mount, so the announcements are already in hand when the user clicks and the
   wallet popup can open inside the click's own task. Opening it after an await is what gets
   it swallowed on mobile Safari. The listener outlives this call: a wallet that finishes
   loading after our dispatch announces itself unprompted, and we still catch it. */
export function startWalletDiscovery() {
  if (typeof window === "undefined") return;
  if (!listening) {
    listening = true;
    window.addEventListener("eip6963:announceProvider", record);
  }
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function phantomEthereum() {
  if (typeof window === "undefined") return null;
  return window.phantom?.ethereum || null;
}

/* Phantom's own docs say its EVM provider "is also made available at window.ethereum" — the
   same object — so reference equality catches the impostor that the isPhantom flag misses. */
function isPhantom(provider) {
  return Boolean(provider) && (provider === phantomEthereum() || provider.isPhantom === true);
}

function isMetaMask(provider) {
  return (
    Boolean(provider) &&
    typeof provider.request === "function" &&
    provider.isMetaMask === true &&
    !isPhantom(provider) &&
    !provider.isBraveWallet &&
    !provider.isCoinbaseWallet &&
    !provider.isRabby &&
    !provider.isTrust
  );
}

/** The EIP-1193 provider for exactly this wallet, or null if it is not installed. */
export function resolveProvider(kind) {
  const spec = WALLETS[kind];
  if (!spec || typeof window === "undefined") return null;

  for (const detail of announced.values()) {
    if (spec.rdnsMatch(detail.info.rdns)) return detail.provider;
  }

  if (kind === "phantom") {
    const provider = phantomEthereum();
    return typeof provider?.request === "function" ? provider : null;
  }

  /* Every current MetaMask announces over EIP-6963. If something announced and it was not
     MetaMask, MetaMask is absent — and falling through to window.ethereum here is precisely
     what pops Phantom open under a button that says MetaMask. Only a page where nobody
     announced at all (an in-app browser, an old build) may guess. */
  if (announced.size > 0) return null;

  const injected = window.ethereum;
  if (isMetaMask(injected)) return injected;
  return injected?.providers?.find?.(isMetaMask) || null;
}

/* Desktop gets the install page. Mobile has no extension to install, so it gets a deep link
   that reopens this page inside the wallet's own browser — the only place its provider exists. */
export function walletHelpUrl(kind) {
  const spec = WALLETS[kind];
  if (!spec || typeof window === "undefined") return null;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  return mobile ? spec.deepLink() : spec.install;
}
