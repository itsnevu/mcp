"use client";

import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import { useI18n } from "@/lib/I18nContext";

export const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

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
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const googleRef = useRef(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { t } = useI18n();

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
          shape: "rectangular",
          text: "continue_with",
          width: 316,
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
        throw new Error("MetaMask, Phantom, or EVM-compatible browser wallet was not found");
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
      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        minHeight: '100dvh',
        background: '#CDDF15',
        margin: 0
      }}>
        <Image 
          src="/logo-128.png" 
          alt="Bugglo Logo" 
          width={64} 
          height={64} 
          style={{ 
            animation: "pulse 2s infinite ease-in-out" 
          }} 
        />
      </main>
    );
  }

  if (user || guest) {
    const authUser = user || { provider: "guest", name: "Guest User" };
    return (
      <AuthContext.Provider value={{ user: authUser, logout: () => { if(guest) setGuest(false); else logout(); }, busy }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-left">
        <div className="auth-nav">
          <div className="auth-nav-logo">
            <Image src="/logo-128.png" alt="Bugglo Logo" width={28} height={28} />
            {APP_NAME}
          </div>
        </div>
        
        <div className="auth-content">
          <h1>{t("auth.command")}.</h1>
          <p>Your AI edge for Robinhood Network intelligence.</p>
          
          <div className="auth-panel">
            {googleClientId ? (
              <div className="auth-google-wrap" ref={googleRef} />
            ) : (
              <div className="auth-disabled">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google login.</div>
            )}
            
            <div className="auth-divider">or</div>
            
            <button className="auth-wallet-btn" onClick={loginWallet} disabled={Boolean(busy)}>
              <span>{busy === "wallet" ? "Waiting for signature..." : t("auth.metamask")}</span>
            </button>
            
            <button className="auth-guest-btn" onClick={() => setGuest(true)}>
              {t("auth.guest")}
            </button>
            
            <div className="auth-disclaimer">
              {t("auth.byContinuing")} <Link href="/privacy">{t("auth.privacy")}</Link>.
            </div>
            
            {error ? <div className="auth-error" style={{marginTop: 8}}>{error}</div> : null}
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-right-image" />
      </div>
    </main>
  );
}
