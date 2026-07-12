"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import SvgSprite from "./SvgSprite";
import Sidebar from "./Sidebar";
import TickerTape from "./TickerTape";
import InputBar from "./InputBar";
import ChatView from "./ChatView";
import SettingsModal from "./SettingsModal";
import { demoAgent } from "@/lib/demoAgent";
import { replyToText, isValidReply } from "@/lib/text";
import { APP_NAME, isValidChatResponse } from "@/lib/chatContract";

const LS_STATE = "hoodscope.state.v1";

/* Validate persisted shape — valid-JSON-but-wrong-shape must not brick the app. */
function loadChatsFromStorage() {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const chats = Array.isArray(parsed?.chats) ? parsed.chats : [];
    return chats.filter(
      (c) => c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages)
    );
  } catch {
    return [];
  }
}

const TRY_CARDS = [
  {
    icon: "i-shield",
    title: ["Rug check a", "contract"],
    q: "Rug check this contract: 0x",
  },
  {
    icon: "i-sparkle",
    title: ["Robinhood Chain", "trending on 𝕏"],
    q: "What's trending about Robinhood Chain on X?",
  },
  {
    icon: "i-search",
    title: ["Search a ticker", "on 𝕏"],
    q: "Search $HOOD ticker sentiment on X",
  },
  {
    icon: "i-trend",
    title: ["Trending tickers", "on 𝕏"],
    q: "What are the trending tickers on X right now?",
  },
];

export default function HoodScopeApp() {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ kind: "demo", label: "Demo mode" });
  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const [mode, setModeState] = useState("Auto");
  const [theme, setTheme] = useState("dark");

  const busyRef = useRef(false);
  const seqRef = useRef(0); // generation token — bumping it invalidates in-flight sends
  const abortTypingRef = useRef(false);
  const fetchCtrlRef = useRef(null);
  const stoppedByUserRef = useRef(false);
  const animateIds = useRef(new Set());
  const chatsRef = useRef([]);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const toastTimer = useRef(null);

  const chatting = activeId !== null;
  const activeMessages = chats.find((c) => c.id === activeId)?.messages ?? [];

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  /* ── hydrate ── */
  useEffect(() => {
    setChats(loadChatsFromStorage());
    try {
      const m = localStorage.getItem("hoodscope.mode") || localStorage.getItem("ranger.mode");
      if (m) setModeState(m);
    } catch {}
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    if (window.innerWidth <= 780) setCollapsed(true); // don't cover mobile screens by default
    setHydrated(true);
  }, []);

  /* ── persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_STATE, JSON.stringify({ chats }));
    } catch {}
  }, [chats, hydrated]);

  /* ── helpers ── */
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2200);
  }, []);

  const scrollBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const backendBase = () => {
    try {
      return (localStorage.getItem("hoodscope.backend") || localStorage.getItem("ranger.backend") || "").replace(/\/+$/, "");
    } catch {
      return "";
    }
  };

  const checkHealth = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(backendBase() + "/api/health", { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => null);
      if (data?.mode === "live-ready") {
        setBackendStatus({ kind: "ready", label: "Live ready" });
      } else {
        setBackendStatus({ kind: "demo", label: "Demo mode" });
      }
      return true;
    } catch {
      setBackendStatus({ kind: "offline", label: "Backend offline" });
      return false;
    }
  }, []);
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  /* release UI ownership from any in-flight send (its reply still persists
     to its own chat, but it may no longer touch busy/animation state) */
  const releaseUi = useCallback(() => {
    seqRef.current++;
    abortTypingRef.current = true;
    busyRef.current = false;
    setBusy(false);
    setAwaiting(false);
  }, []);

  const goHome = useCallback(() => {
    releaseUi();
    setActiveId(null);
    setDraft("");
    inputRef.current?.focus();
  }, [releaseUi]);

  const loadChat = useCallback(
    (id) => {
      if (id === activeId) return;
      releaseUi();
      setActiveId(id);
    },
    [activeId, releaseUi]
  );

  const deleteChat = useCallback(
    (id) => {
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) {
        fetchCtrlRef.current?.abort(); // reply target is gone — stop wasted work
        goHome();
      }
      showToast("Chat deleted");
    },
    [activeId, goHome, showToast]
  );

  const clearAllChats = useCallback(() => {
    fetchCtrlRef.current?.abort();
    setChats([]);
    goHome();
    setSettingsOpen(false);
    showToast("All chats cleared");
  }, [goHome, showToast]);

  const setMode = useCallback((m) => {
    setModeState(m);
    try {
      localStorage.setItem("hoodscope.mode", m);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("hoodscope.theme", next);
      } catch {}
      return next;
    });
  }, []);

  const onTypingDone = useCallback(() => {
    busyRef.current = false;
    setBusy(false);
  }, []);

  const stopGeneration = useCallback(() => {
    stoppedByUserRef.current = true;
    abortTypingRef.current = true;
    fetchCtrlRef.current?.abort();
  }, []);

  /* ── send ── */
  const send = useCallback(
    async (rawText) => {
      const text = String(rawText || "").trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      abortTypingRef.current = false;
      stoppedByUserRef.current = false;
      const myTok = ++seqRef.current;

      const now = Date.now();
      const userMsg = { id: "m" + now + "u", role: "user", content: text, ts: now };
      let id = activeId;
      let prevMessages = [];
      if (!id) {
        id = "c" + now.toString(36) + Math.random().toString(36).slice(2, 6);
        setChats((prev) => [
          { id, title: text.length > 26 ? text.slice(0, 26) + "…" : text, messages: [userMsg] },
          ...prev,
        ]);
        setActiveId(id);
      } else {
        prevMessages = chatsRef.current.find((c) => c.id === id)?.messages ?? [];
        setChats((prev) =>
          prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, userMsg] } : c))
        );
      }
      setDraft("");
      setAwaiting(true);

      let reply = null;
      try {
        const history = prevMessages.slice(-11).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          text: m.role === "user" ? m.content : replyToText(m.content),
        }));

        const ctrl = new AbortController();
        fetchCtrlRef.current = ctrl;
        const timer = setTimeout(() => ctrl.abort(), 20000); // hung backend can't wedge the UI
        let gotLive = false;
        let authRequired = false;
        try {
          const res = await fetch(backendBase() + "/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, mode, history }),
            signal: ctrl.signal,
          });
          if (res.status === 401) {
            authRequired = true;
            throw new Error("authentication required");
          }
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (isValidChatResponse(data)) {
              reply = data.reply;
              gotLive = true;
              setBackendStatus(data.source === "live" ? { kind: "live", label: "Live data" } : { kind: "demo", label: "Demo mode" });
            } else if (data && isValidReply(data.reply)) {
              reply = data.reply;
              gotLive = true;
              setBackendStatus({ kind: "demo", label: "Demo mode" });
            }
          }
        } catch {
          /* network error, abort, or timeout — handled below */
        } finally {
          clearTimeout(timer);
          fetchCtrlRef.current = null;
        }

        if (!gotLive) {
          if (stoppedByUserRef.current) {
            reply = null; // user hit stop while the request was in flight
          } else if (authRequired) {
            showToast("Session expired. Please log in again.");
            setTimeout(() => window.location.reload(), 800);
            reply = null;
          } else {
            setBackendStatus({ kind: "offline", label: "Demo fallback" });
            await new Promise((r) => setTimeout(r, 500));
            reply = demoAgent(text);
          }
        }
      } finally {
        if (seqRef.current === myTok) setAwaiting(false);
      }

      if (!reply) {
        if (seqRef.current === myTok) {
          busyRef.current = false;
          setBusy(false);
        }
        return;
      }

      const rts = Date.now();
      const agentMsg = { id: "m" + rts + "a", role: "agent", content: reply, ts: rts };
      const stillCurrent = seqRef.current === myTok;
      if (stillCurrent) animateIds.current.add(agentMsg.id);
      // Always persist into the ORIGINATING chat (captured id), never the
      // currently-active one — switching chats mid-flight can't misfile it.
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, agentMsg] } : c)));
      // If superseded (user navigated / started a new send), a newer owner
      // controls busy state; the reply is saved and renders when viewed.
      // Otherwise busy is released by onTypingDone when the typewriter ends.
      if (!stillCurrent) return;
    },
    [activeId, mode, showToast]
  );

  const onSuggest = useCallback(
    (q) => {
      if (q.endsWith("0x") || q.endsWith("$")) {
        setDraft(q);
        inputRef.current?.focus();
      } else {
        send(q);
      }
    },
    [send]
  );

  const onSaveBackend = useCallback(
    async (url) => {
      try {
        localStorage.setItem("hoodscope.backend", url);
      } catch {}
      const ok = await checkHealth();
      showToast(ok ? "Backend reachable" : "Backend unreachable — demo mode");
    },
    [checkHealth, showToast]
  );

  /* ── global shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* keep the input focused when it jumps between hero and dock */
  useEffect(() => {
    if (hydrated) inputRef.current?.focus();
  }, [chatting, hydrated]);

  /* keep chat scrolled to the newest message */
  useEffect(() => {
    scrollBottom();
  }, [activeMessages.length, awaiting, activeId, scrollBottom]);

  const inputBar = (docked) => (
    <InputBar
      draft={draft}
      setDraft={setDraft}
      busy={busy}
      onSend={send}
      onStop={stopGeneration}
      mode={mode}
      setMode={setMode}
      docked={docked}
      inputRef={inputRef}
      showToast={showToast}
    />
  );

  return (
    <>
      <SvgSprite />
      <div className="app">
        <Sidebar
          chats={chats}
          activeId={activeId}
          collapsed={collapsed}
          onCollapse={() => setCollapsed(true)}
          onNewChat={goHome}
          onLoadChat={loadChat}
          onDeleteChat={deleteChat}
          onSuggest={onSuggest}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {!collapsed && <div className="sidebar-backdrop" onClick={() => setCollapsed(true)} />}
        <button
          className={"expand-btn" + (collapsed ? " visible" : "")}
          onClick={() => setCollapsed(false)}
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <svg viewBox="0 0 24 24">
            <use href="#i-panel" />
          </svg>
        </button>

        <main className="main">
          <TickerTape />
          <div className={"status-pill " + backendStatus.kind} title="Backend status">
            <span className="dot" />
            <span>{backendStatus.label}</span>
          </div>

          <div className="main-scroll" ref={scrollRef}>
            {!chatting ? (
              <div className="home-wrap">
                <div className="hero">
                  <div className="hero-logo">
                    <Image src="/logo-512.png" alt={`${APP_NAME} logo`} width={84} height={84} priority />
                  </div>
                  <div className="hero-title-row">
                    <div className="hero-title">{APP_NAME}</div>
                    <div className="beta-pill">BETA</div>
                  </div>
                </div>

                <div className="hero-sub">
                  What&apos;s moving on <span className="accent">Robinhood Chain</span>?
                </div>

                {inputBar(false)}

                <div className="try-label">Try one of these</div>
                <div className="try-grid">
                  {TRY_CARDS.map((c) => (
                    <button className="try-card" key={c.q} onClick={() => onSuggest(c.q)}>
                      <div className="card-icon">
                        <svg viewBox="0 0 24 24">
                          <use href={`#${c.icon}`} />
                        </svg>
                      </div>
                      <div className="card-title">
                        {c.title[0]}
                        <br />
                        {c.title[1]}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  className="x-banner"
                  onClick={() =>
                    window.open(
                      "https://x.com/intent/tweet?text=" +
                        encodeURIComponent("What's moving on Robinhood Chain today?"),
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  <div className="x-badge">
                    <svg viewBox="0 0 24 24">
                      <use href="#i-x" />
                    </svg>
                  </div>
                  <div className="x-banner-text">
                    <span className="new-tag">NEW</span> · Share a Robinhood Chain question on 𝕏
                  </div>
                  <div className="x-banner-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </div>
                </button>

                <div className="home-footer">
                  <div className="disclaimer">
                    Information provided may be inaccurate or incorrect.
                    <br />
                    By messaging {APP_NAME}, you agree to our <a href="/terms">Terms</a>, <a href="/privacy">Privacy Policy</a>, and <a href="/docs">Docs</a>.
                  </div>
                  <button className="theme-toggle" onClick={toggleTheme}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                    <span>{theme === "dark" ? "Dark" : "Light"}</span>
                    <span className="switch" />
                  </button>
                </div>
              </div>
            ) : (
              <ChatView
                messages={activeMessages}
                awaiting={awaiting}
                animateIds={animateIds}
                abortRef={abortTypingRef}
                onTypingDone={onTypingDone}
                showToast={showToast}
                scrollBottom={scrollBottom}
              />
            )}
          </div>

          {chatting && (
            <div className="chat-input-dock">
              {inputBar(true)}
              <div className="dock-disclaimer">
                Information provided may be inaccurate or incorrect. Not financial advice.
              </div>
            </div>
          )}
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        backendStatus={backendStatus}
        onSaveTest={onSaveBackend}
        onClearChats={clearAllChats}
      />
      <div className={"toast" + (toastShow ? " show" : "")}>{toastMsg}</div>
    </>
  );
}
