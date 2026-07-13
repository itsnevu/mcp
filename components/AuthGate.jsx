"use client";

import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import { useI18n } from "@/lib/I18nContext";
import { resolveProvider, startWalletDiscovery, walletHelpUrl } from "@/lib/walletProviders";

export const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

/* personal_sign takes the message hex-encoded — MetaMask's docs call it a historical quirk
   and Phantom's docs do the same. The decoded bytes are the identical UTF-8, so the
   EIP-191 preimage the server re-derives with viem is unchanged, and both wallets still show
   the human-readable text in their signing prompt. */
function toHexMessage(message) {
  return `0x${Array.from(new TextEncoder().encode(message))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("window unavailable"));
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function AuthGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [helpLink, setHelpLink] = useState(null);
  const googleRef = useRef(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { t, tRich, activeLang } = useI18n();

  const refreshSession = useCallback(async () => {
    const [res] = await Promise.all([
      fetch("/api/auth/session", { cache: "no-store" }),
      new Promise((resolve) => setTimeout(resolve, 1500))
    ]);
    const data = await res.json().catch(() => null);
    setUser(data?.authenticated ? data.user : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /* Collect the wallets' EIP-6963 announcements while the visitor is still reading the page,
     so that clicking a wallet button resolves its provider synchronously. */
  useEffect(() => {
    startWalletDiscovery();
  }, []);

  /* A guest is now just a `user` whose provider is "guest" — there is no separate `guest`
     flag to depend on. Logging out of a guest session clears `user`, which remounts the gate
     with a fresh div and re-runs this effect to paint the Google button into it. */
  useEffect(() => {
    if (loading || user || !googleClientId || !googleRef.current) return;
    let cancelled = false;
    let observer;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            setBusy("google");
            setError("");
            setHelpLink(null);
            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ credential }),
              });
              const data = await res.json().catch(() => null);
              if (!res.ok) throw new Error(data?.error || t("auth.error.google"));
              setUser(data.user);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy("");
            }
          },
        });
        /* theme: "filled_black" makes GSI paint a 36px white tile behind the G and drop the
           button's border entirely. "outline_dark" paints neither, and its native look —
           40px tall, 4px radius, #131314 on a 1px #8e918f stroke — is already .auth-wallet-btn.

           `width` is the part that was missing, and it is the whole white frame. GSI sizes the
           box it draws from the button's own text, and it ignores CSS width on that subtree —
           the pixel `width` here is the only lever (a minimum, capped at 400 by Google). Left
           unset, the personalized "Continue as <name>" variant is as wide as the name and the
           email inside it, so it came out a different width from the wallet buttons beside it,
           and the stylesheet's `width: 100% !important` only stretched the button *within* that
           mis-sized box — the leftover was the frame. Measuring the wrap and handing GSI that
           number sizes the box itself, so every button in the panel matches.

           renderButton empties the container before it draws, so redrawing on resize or on a
           language change replaces the button rather than stacking a second one. */
        const drawButton = () => {
          const el = googleRef.current;
          if (!el) return;
          const width = Math.min(400, Math.round(el.getBoundingClientRect().width));
          if (!width) return;
          window.google.accounts.id.renderButton(el, {
            theme: "outline_dark",
            size: "large",
            shape: "rectangular",
            text: "continue_with",
            logo_alignment: "center",
            locale: activeLang,
            width,
          });
        };

        drawButton();
        observer = new ResizeObserver(drawButton);
        observer.observe(googleRef.current);
      })
      .catch(() => setError(t("auth.error.googleScript")));
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [googleClientId, loading, user, activeLang, t]);

  /* Mints a REAL signed session from the server (24h, provider:"guest") instead of flipping a
     boolean in React. That boolean was the whole bug: with no cookie, /api/chat would have
     401'd, so the app quietly stopped calling it and answered guests from a local browser script
     in the browser. A guest now carries a cookie the backend accepts, gets live answers, and
     is metered by IP server-side (lib/rateLimit.js, guest tier). */
  const loginGuest = useCallback(async () => {
    setBusy("guest");
    setError("");
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.user) throw new Error(t("auth.error.guest"));
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }, [t]);

  const loginWallet = async (wallet) => {
    setBusy(wallet);
    setError("");
    setHelpLink(null);
    try {
      const provider = resolveProvider(wallet);
      if (!provider) {
        const href = walletHelpUrl(wallet);
        if (href) setHelpLink({ href, label: t(`auth.install.${wallet}`) });
        throw new Error(t(`auth.error.missing.${wallet}`));
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0];
      if (!address) throw new Error(t("auth.error.noAccount"));

      const nonceRes = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const nonceData = await nonceRes.json().catch(() => null);
      if (!nonceRes.ok) throw new Error(nonceData?.error || t("auth.error.challenge"));

      const signature = await provider.request({
        method: "personal_sign",
        params: [toHexMessage(nonceData.message), address],
      });

      const verifyRes = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, signature, message: nonceData.message }),
      });
      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok) throw new Error(verifyData?.error || t("auth.error.verify"));
      setUser(verifyData.user);
    } catch (err) {
      /* 4001 is EIP-1193's "user rejected" — the same code in both wallets. */
      setError(err?.code === 4001 ? t("auth.error.cancelled") : err.message);
    } finally {
      setBusy("");
    }
  };

  const logout = async () => {
    setBusy("logout");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    setBusy("");
  };

  if (loading) {
    return (
      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        minHeight: '100dvh',
        /* must stay equal to the lime baked into logo-128.png, or the logo's own
           background reads as a visible square against the splash */
        background: '#C7D903',
        margin: 0
      }}>
        <Image
          src="/logo-128.png"
          alt={t("a11y.logoAlt")}
          width={64}
          height={64}
          style={{
            animation: "pulse 2s infinite ease-in-out"
          }}
        />
      </main>
    );
  }

  if (user) {
    return (
      <AuthContext.Provider value={{ user, logout, busy }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-left">
        <div className="auth-nav">
          <div className="auth-nav-logo">
            <Image src="/logo-128.png" alt={t("a11y.logoAlt")} width={28} height={28} />
            {APP_NAME}
          </div>
        </div>

        <div className="auth-content">
          <h1>{t("auth.command")}.</h1>
          <p>{t("auth.tagline")}</p>

          <div className="auth-panel">
            {googleClientId ? (
              <div className="auth-google-wrap" ref={googleRef} />
            ) : (
              <div className="auth-disabled">{t("auth.googleDisabled")}</div>
            )}

            <div className="auth-divider">{t("auth.or")}</div>

            <button
              className="auth-wallet-btn"
              onClick={() => loginWallet("metamask")}
              disabled={Boolean(busy)}
            >
              <span>{busy === "metamask" ? t("auth.waitingSignature") : t("auth.metamask")}</span>
            </button>

            <button
              className="auth-wallet-btn"
              onClick={() => loginWallet("phantom")}
              disabled={Boolean(busy)}
            >
              <span>{busy === "phantom" ? t("auth.waitingSignature") : t("auth.phantom")}</span>
            </button>

            <button className="auth-guest-btn" onClick={loginGuest} disabled={Boolean(busy)}>
              {busy === "guest" ? t("auth.guestStarting") : t("auth.guest")}
            </button>

            <div className="auth-disclaimer">
              {tRich("auth.acknowledge", {
                privacy: <Link href="/privacy">{t("auth.privacy")}</Link>,
              })}
            </div>

            {error ? (
              <div className="auth-error" style={{marginTop: 8}}>
                {error}
                {helpLink ? (
                  <a href={helpLink.href} target="_blank" rel="noopener noreferrer">
                    {helpLink.label}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-right-image" />
      </div>
    </main>
  );
}
