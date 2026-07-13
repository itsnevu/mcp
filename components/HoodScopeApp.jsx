"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import SvgSprite from "./SvgSprite";
import Sidebar from "./Sidebar";
import TickerTape from "./TickerTape";
import InputBar from "./InputBar";
import ChatView from "./ChatView";
import SettingsModal from "./SettingsModal";
import VoiceMode from "./VoiceMode";
/* The browser has no business inventing an answer when the backend does not give it one. */
import { replyToText, isValidReply } from "@/lib/text";
import { APP_NAME, CHAIN_NAME, isValidChatResponse } from "@/lib/chatContract";
import { intakeFiles, toStoredAttachments, toWireAttachments } from "@/lib/fileIntake";
import { useAuth } from "./AuthGate";
import { useI18n } from "@/lib/I18nContext";

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

/* `q` is the agent prompt and stays English; `titleKey` is what the user reads. */
const TRY_CARDS = [
  { icon: "i-shield", titleKey: "suggest.rugCheck", q: "Rug check this contract: 0x" },
  { icon: "i-sparkle", titleKey: "suggest.chainTrending", q: "What's trending about Robinhood Chain on X?" },
  { icon: "i-search", titleKey: "suggest.searchTicker", q: "Search $HOOD ticker sentiment on X" },
  { icon: "i-trend", titleKey: "suggest.trendingTickers", q: "What are the trending tickers on X right now?" },
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
  const [isIncognito, setIsIncognito] = useState(false);
  /* Store the status KIND, not a rendered label — the label is looked up at
     render time so it re-translates when the language changes. `labelKey` is
     separate from `kind` because the rendered copy is translated at display time. */
  const [backendStatus, setBackendStatus] = useState({ kind: "offline", labelKey: "status.offline" });
  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const [mode, setModeState] = useState("Auto");
  const [theme, setTheme] = useState("dark");
  /* Attachments are staged here, NOT in the draft: they survive a cleared input, they are
     cleared by a send, and the full-size image data never enters chat history (see
     toStoredAttachments — a data URL per message would blow the localStorage quota). */
  const [attachments, setAttachments] = useState([]);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const auth = useAuth();
  const { t, tRich } = useI18n();

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
  const activeChat = chats.find((c) => c.id === activeId);
  const activeMessages = activeChat?.messages ?? [];
  const currentIncognito = activeChat ? activeChat.incognito : isIncognito;

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  /* ── hydrate ── */
  useEffect(() => {
    setChats(loadChatsFromStorage());
    try {
      const m = localStorage.getItem("hoodscope.mode") || localStorage.getItem("ranger.mode");
      if (m) setModeState(m);
      /* Mirror the pre-paint script in app/layout.js, which also honors the
         legacy key — reading only the new one would flip a returning user's
         theme back to dark after first paint. */
      const savedTheme =
        localStorage.getItem("hoodscope.theme") || localStorage.getItem("ranger.theme") || "dark";
      setTheme(savedTheme);
      localStorage.setItem("hoodscope.theme", savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } catch {}
    if (window.innerWidth <= 780) setCollapsed(true); // don't cover mobile screens by default
    setHydrated(true);
  }, []);

  /* ── persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_STATE, JSON.stringify({ chats: chats.filter(c => !c.incognito) }));
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
        setBackendStatus({ kind: "ready", labelKey: "status.ready" });
      } else {
        setBackendStatus({ kind: "offline", labelKey: "status.offline" });
      }
      return true;
    } catch {
      setBackendStatus({ kind: "offline", labelKey: "status.offline" });
      return false;
    }
  }, []);

  const onSaveBackend = useCallback(async (url) => {
    try {
      localStorage.setItem("hoodscope.backend", url);
    } catch {}
    const ok = await checkHealth();
    showToast(ok ? t("toast.backendConnected") : t("toast.backendOffline"));
  }, [checkHealth, showToast, t]);

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
    setIsIncognito(false);
    setDraft("");
    inputRef.current?.focus();
  }, [releaseUi]);

  const goIncognito = useCallback(() => {
    setIsIncognito((prev) => {
      const next = !prev;
      releaseUi();
      setActiveId(null);
      setDraft("");
      inputRef.current?.focus();
      return next;
    });
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
      showToast(t("toast.chatDeleted"));
    },
    [activeId, goHome, showToast, t]
  );

  const clearAllChats = useCallback(() => {
    fetchCtrlRef.current?.abort();
    setChats([]);
    goHome();
    setSettingsOpen(false);
    showToast(t("toast.chatsCleared"));
  }, [goHome, showToast, t]);

  const setMode = useCallback((m) => {
    setModeState(m);
    try {
      localStorage.setItem("hoodscope.mode", m);
    } catch {}
  }, []);

  /* Value-driven, not a blind flip: Settings > Appearance is a radio group, so
     clicking the already-active theme must be a no-op, not an inversion. It is
     now the only way to change the theme — the home-footer toggle is gone. */
  const applyTheme = useCallback((next) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("hoodscope.theme", next);
    } catch {}
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

  const send = useCallback(
    async (rawText) => {
      const text = String(rawText || "").trim();
      const files = attachments;
      /* A file with no prose is a complete request ("read this"), so an empty box is only
         empty when nothing is attached to it either. */
      if ((!text && !files.length) || busyRef.current) return null;

      /* Guests now hold a real signed session (POST /api/auth/guest) and are answered by the
         live engine like anyone else — attachments included. Their quota is enforced SERVER
         side, keyed on IP (lib/rateLimit.js, guest tier), and the server says when they are
         done by returning 429 { guestLimit: true }.

         What used to be here: a localStorage counter that kicked them out after 3 turns, and
         — far worse — a short-circuit below that answered them in the browser instead of ever
         calling the backend. A counter in localStorage is not a quota anyway; clearing site data
         reset it. The server is the only thing that can say no. */

      busyRef.current = true;
      setBusy(true);
      abortTypingRef.current = false;
      stoppedByUserRef.current = false;
      const myTok = ++seqRef.current;

      const now = Date.now();
      const userMsg = {
        id: "m" + now + "u",
        role: "user",
        content: text,
        ts: now,
        ...(files.length ? { attachments: toStoredAttachments(files) } : {}),
      };
      const titleSource = text || files[0]?.name || "";
      let id = activeId;
      let prevMessages = [];
      if (!id) {
        id = "c" + now.toString(36) + Math.random().toString(36).slice(2, 6);
        setChats((prev) => [
          {
            id,
            title: titleSource.length > 26 ? titleSource.slice(0, 26) + "…" : titleSource,
            messages: [userMsg],
            incognito: isIncognito,
          },
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
      setAttachments([]); // consumed by this turn; they are not re-sent on the next one
      setAwaiting(true);

      let reply = null;
      try {
        const history = prevMessages.slice(-11).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          /* An earlier turn's files are NOT replayed — only the fact that they existed. Re-
             sending a 6000-character CSV on every subsequent question would re-bill it every
             time, and the model has already read it once. */
          text:
            m.role === "user"
              ? m.content ||
                (m.attachments?.length ? `[attached: ${m.attachments.map((a) => a.name).join(", ")}]` : "")
              : replyToText(m.content),
        }));

        const ctrl = new AbortController();
        fetchCtrlRef.current = ctrl;
        /* Must outlast the server's own deadline, not undercut it. A live answer is an
           agentic loop — several model turns with MCP tool calls between them — and a
           tool-using question routinely runs past 20s. Giving up first throws away a reply
           the backend is still paying for. */
        const timer = setTimeout(() => ctrl.abort(), 90000); // hung backend can't wedge the UI
        let gotLive = false;
        let authRequired = false;
        let serverBusy = false;
        let guestLimit = false;
        try {
          const res = await fetch(backendBase() + "/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(currentIncognito ? { "X-Bugglo-Incognito": "1" } : {}),
            },
            body: JSON.stringify({
              message: text,
              mode,
              history,
              attachments: toWireAttachments(files),
              incognito: currentIncognito,
            }),
            signal: ctrl.signal,
          });
          if (res.status === 401) {
            authRequired = true;
            throw new Error("authentication required");
          }
          /* Over a cap. This must NOT synthesize an answer: the user asked a real
             question about real money, and answering it with made-up numbers they did
             not ask for is worse than telling them to come back in a minute. */
          if (res.status === 429) {
            const data = await res.json().catch(() => null);
            guestLimit = Boolean(data?.guestLimit);
            serverBusy = true;
            throw new Error("server busy");
          }
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (isValidChatResponse(data)) {
              reply = data.reply;
              gotLive = true;
              /* Three states, and the difference between them matters to someone about to
                 spend money. "live" = the engine answered with its chain tools. "degraded" =
                 the engine answered, but its tools were down, so nothing in it is chain-
                 verified. Collapsing those two into one green badge is how an unverified
                 claim gets read as a verified one. */
              setBackendStatus(
                data.source !== "live"
                  ? { kind: "offline", labelKey: "status.offline" }
                  : data.degraded
                    ? { kind: "degraded", labelKey: "status.degraded" }
                    : { kind: "live", labelKey: "status.live" }
              );
            } else if (data && isValidReply(data.reply)) {
              reply = data.reply;
              gotLive = true;
              setBackendStatus({ kind: "offline", labelKey: "status.offline" });
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
            /* A guest holds a real 24h cookie now, so a guest session can expire like any
               other. Reload back to the auth screen instead of quietly answering them from a
               script — which is exactly what the old `&& !isGuest` guard caused. */
            showToast(t("toast.sessionExpired"));
            setTimeout(() => window.location.reload(), 800);
            reply = null;
          } else if (guestLimit) {
            setBackendStatus({ kind: "offline", labelKey: "status.offline" });
            reply = { kind: "text", text: t("chat.guestLimit") };
          } else if (serverBusy) {
            setBackendStatus({ kind: "offline", labelKey: "status.offline" });
            reply = { kind: "text", text: t("chat.serverBusy") };
          } else {
            /* The backend did not answer. We say so.
               An outage that looks like an answer is worse than an outage that looks like an
               outage, because nobody reports it and someone trades on it. Never synthesize an
               answer here. */
            setBackendStatus({ kind: "offline", labelKey: "status.offline" });
            reply = { kind: "text", text: t("chat.unavailable") };
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
        return null;
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

      /* Returned, not just rendered: voice mode has to speak this, and it cannot read it back
         out of chat state without racing the typewriter. null means "nothing was said" —
         stopped, rate-limited, or refused — and the caller must not narrate that. */
      return reply;
    },
    [activeId, mode, showToast, isIncognito, currentIncognito, t, attachments]
  );

  /* ── attachments ── */

  const onAttachFiles = useCallback(
    async (files) => {
      const { attachments: added, errors } = await intakeFiles(files, { existingCount: attachments.length });
      if (added.length) setAttachments((prev) => [...prev, ...added]);
      /* One toast, for the first thing that went wrong. A stack of five toasts for five
         rejected files is noise nobody reads. */
      if (errors.length) showToast(t(`attach.err.${errors[0].reason}`, { name: errors[0].name }));
    },
    [attachments.length, showToast, t]
  );

  const onRemoveAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /* ── voice mode ── */

  /* The typewriter is a nice touch when you are reading; when you are LISTENING it is just a
     delay that holds `busy` high and blocks the next turn. Skip straight to the finished
     message so the answer can be spoken the moment it lands. */
  const voiceSend = useCallback(
    async (text) => {
      const reply = await send(text);
      abortTypingRef.current = true;
      return reply;
    },
    [send]
  );

  const closeVoice = useCallback(() => {
    setVoiceOpen(false);
    inputRef.current?.focus();
  }, []);

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

  /* ── global shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      /* The user menu advertises this chord next to "Settings"; bind it so the
         hint is true (and so ⌘, does not fall through to the browser).
         Keyed on e.code, not e.key — holding Shift turns "," into "<". */
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Comma") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      /* Hands-free from the keyboard. Keyed on e.code because ⇧V is "V" on a US layout and
         something else entirely on others. */
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyV") {
        e.preventDefault();
        setVoiceOpen(true);
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
      isIncognito={isIncognito}
      attachments={attachments}
      onAttachFiles={onAttachFiles}
      onRemoveAttachment={onRemoveAttachment}
      onOpenVoice={() => setVoiceOpen(true)}
    />
  );

  return (
    <>
      <SvgSprite />
      <div className="app">
        <Sidebar
          chats={chats}
          activeId={activeId}
          onLoadChat={loadChat}
          onNewChat={goHome}
          onDeleteChat={deleteChat}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          onIncognitoChat={goIncognito}
          onSuggest={send}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {!collapsed && <div className="sidebar-backdrop" onClick={() => setCollapsed(true)} />}
        <button
          className={"expand-btn" + (collapsed ? " visible" : "")}
          onClick={() => setCollapsed(false)}
          title={t("sidebar.open")}
          aria-label={t("sidebar.open")}
        >
          <svg viewBox="0 0 24 24">
            <use href="#i-panel" />
          </svg>
        </button>

        <main className="main">
          <TickerTape />
          <div className={"status-pill " + backendStatus.kind} title={t("status.tooltip")}>
            <span className="dot" />
            <span>{t(backendStatus.labelKey)}</span>
          </div>

          <div className="main-scroll" ref={scrollRef}>
            {!chatting ? (
              <div className="home-wrap">
                {isIncognito ? (
                  <div className="incognito-hero">
                    <div className="hero-logo" style={{ background: "transparent", color: "var(--text)", boxShadow: "none", animation: "none" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 42, height: 42 }}>
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                      </svg>
                    </div>
                    <div className="hero-title-row" style={{ justifyContent: "center" }}>
                      <div className="hero-title" style={{ fontWeight: 400, letterSpacing: "-0.02em" }}>{t("app.incognitoTitle")}</div>
                    </div>
                  </div>
                ) : (
                  <div className="hero">
                    <div className="hero-logo">
                      <Image src="/logo-512.png" alt={t("a11y.logoAlt")} width={84} height={84} priority />
                    </div>
                    <div className="hero-title-row">
                      <div className="hero-title">{APP_NAME}</div>
                      <div className="beta-pill">{t("app.beta")}</div>
                    </div>
                  </div>
                )}

                {!isIncognito && (
                  <div className="hero-sub">
                    {tRich("app.heroSub", { chain: <span className="accent">{CHAIN_NAME}</span> })}
                  </div>
                )}

                {inputBar(false)}

                {isIncognito ? (
                  <div className="incognito-disclaimer">
                    {t("app.incognitoDesc")}
                    <br />
                    {tRich("app.incognitoLearn", {
                      link: <Link href="/learn">{t("app.learnMore")}</Link>,
                    })}
                  </div>
                ) : (
                  <>
                    <div className="try-label">{t("app.tryThese")}</div>
                    <div className="try-grid">
                      {TRY_CARDS.map((c) => (
                        <button className="try-card" key={c.q} onClick={() => onSuggest(c.q)}>
                          <div className="card-icon">
                            <svg viewBox="0 0 24 24">
                              <use href={`#${c.icon}`} />
                            </svg>
                          </div>
                          <div className="card-title">{t(c.titleKey)}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {!isIncognito && (
                  <button
                    className="x-banner"
                    onClick={() =>
                      window.open(
                        "https://x.com/intent/tweet?text=" +
                          /* Tweet body stays English — it is public content about an
                             English-named chain, not UI chrome. */
                          encodeURIComponent(`What's moving on ${CHAIN_NAME} today?`),
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
                      <span className="new-tag">{t("app.newTag")}</span> &middot; {t("app.shareX")}
                    </div>
                    <div className="x-banner-arrow">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </div>
                  </button>
                )}

                <div className="home-footer">
                  <div className="disclaimer">
                    {t("app.infoWarning")}
                    <br />
                    {tRich("app.legalLine", {
                      terms: <Link href="/terms">{t("app.terms")}</Link>,
                      privacy: <Link href="/privacy">{t("app.privacy")}</Link>,
                      docs: <Link href="/docs">{t("app.docs")}</Link>,
                    })}
                  </div>
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
              <div className="dock-disclaimer">{t("app.dockDisclaimer")}</div>
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
        theme={theme}
        onThemeChange={applyTheme}
      />
      <VoiceMode open={voiceOpen} onClose={closeVoice} onSend={voiceSend} showToast={showToast} />
      <div className={"toast" + (toastShow ? " show" : "")}>{toastMsg}</div>
    </>
  );
}
