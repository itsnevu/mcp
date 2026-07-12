"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_NAME } from "@/lib/chatContract";

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
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
  const googleRef = useRef(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setUser(data?.authenticated ? data.user : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (loading || user || !googleClientId || !googleRef.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            setBusy("google");
            setError("");
            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ credential }),
              });
              const data = await res.json().catch(() => null);
              if (!res.ok) throw new Error(data?.error || "Google login failed");
              setUser(data.user);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy("");
            }
          },
        });
        window.google.accounts.id.renderButton(googleRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 280,
        });
      })
      .catch(() => setError("Google login script failed to load"));
    return () => {
      cancelled = true;
    };
  }, [googleClientId, loading, user]);

  const loginWallet = async () => {
    setBusy("wallet");
    setError("");
    try {
      const provider = window.ethereum;
      if (!provider?.request) {
        throw new Error("Robinhood Wallet-compatible browser wallet was not found");
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0];
      if (!address) throw new Error("No wallet account selected");

      const nonceRes = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const nonceData = await nonceRes.json().catch(() => null);
      if (!nonceRes.ok) throw new Error(nonceData?.error || "Wallet challenge failed");

      let signature;
      try {
        signature = await provider.request({
          method: "personal_sign",
          params: [nonceData.message, address],
        });
      } catch (err) {
        if (err?.code === 4001) throw err;
        signature = await provider.request({
          method: "personal_sign",
          params: [address, nonceData.message],
        });
      }

      const verifyRes = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, signature, message: nonceData.message }),
      });
      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok) throw new Error(verifyData?.error || "Wallet signature verification failed");
      setUser(verifyData.user);
    } catch (err) {
      setError(err?.code === 4001 ? "Wallet signature was cancelled" : err.message);
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
      <main className="auth-page">
        <div className="auth-panel">
          <div className="auth-mark">H</div>
          <p>Checking session...</p>
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <>
        <div className="auth-user-pill">
          <span>{user.provider === "wallet" ? shortAddress(user.address) : user.email || user.name}</span>
          <button onClick={logout} disabled={busy === "logout"}>
            Logout
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-mark">H</div>
        <div>
          <div className="auth-kicker">Secure access</div>
          <h1>Sign in to {APP_NAME}</h1>
          <p>
            Continue with a Google account or prove ownership of a Robinhood Wallet-compatible
            EVM wallet. Wallet login only signs a message; it never sends a transaction.
          </p>
        </div>

        <div className="auth-actions">
          <button className="auth-wallet-btn" onClick={loginWallet} disabled={Boolean(busy)}>
            <span>{busy === "wallet" ? "Waiting for signature..." : "Continue with Robinhood Wallet"}</span>
          </button>
          <div className="auth-divider"><span>or</span></div>
          {googleClientId ? (
            <div className="auth-google-wrap" ref={googleRef} />
          ) : (
            <div className="auth-disabled">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google login.</div>
          )}
        </div>

        {error ? <div className="auth-error">{error}</div> : null}
        <div className="auth-note">
          API calls to <code>/api/chat</code> require this session cookie. Docs, Terms, Privacy,
          health check, and auth routes remain public.
        </div>
      </section>
    </main>
  );
}
