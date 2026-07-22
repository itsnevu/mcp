"use client";

/* Sidebar: brand, New Chat, persistent recents, suggested prompts, user menu */
import Image from "next/image";
import { APP_NAME } from "@/lib/chatContract";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthGate";
import { useI18n } from "@/lib/I18nContext";

function shortAddr(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/* `q` is the prompt sent to the agent and stays English on purpose — the model
   is prompted in English regardless of the UI language. Only `labelKey` is shown. */
const SECTIONS = [
  {
    labelKey: "sidebar.section.sentiment",
    x: true,
    items: [
      {
        labelKey: "suggest.searchTicker",
        q: "Search $HOOD ticker sentiment on X",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-search" />
          </svg>
        ),
      },
      {
        labelKey: "suggest.trendingTickers",
        q: "What are the trending tickers on X right now?",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-trend" />
          </svg>
        ),
      },
      {
        labelKey: "suggest.topAccounts",
        q: "Who are the top X accounts talking about $HOOD?",
        icon: (
          <svg viewBox="0 0 24 24" {...stroke}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        labelKey: "suggest.chainTrending",
        q: "What's trending about Robinhood Chain on X?",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-sparkle" />
          </svg>
        ),
      },
      {
        labelKey: "suggest.fud",
        q: "Run FUD detection for $HOOD",
        icon: (
          <svg viewBox="0 0 24 24" {...stroke}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
      },
      {
        labelKey: "suggest.communitySentiment",
        q: "What's the community sentiment for $HOOD?",
        icon: (
          <svg viewBox="0 0 24 24" {...stroke}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
          </svg>
        ),
      },
    ],
  },
  {
    labelKey: "sidebar.section.market",
    items: [
      {
        labelKey: "suggest.topTokens",
        q: "Top trending Robinhood Chain tokens today",
        icon: (
          <svg viewBox="0 0 24 24" {...stroke}>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        ),
      },
      {
        labelKey: "suggest.latestDex",
        q: "Show the latest DEX tokens on Robinhood Chain",
        icon: (
          <svg viewBox="0 0 24 24" {...stroke}>
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        ),
      },
    ],
  },
  {
    labelKey: "sidebar.section.security",
    items: [
      {
        labelKey: "suggest.rugCheck",
        q: "Rug check this contract: 0x",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-shield" />
          </svg>
        ),
      },
      {
        labelKey: "suggest.topHolders",
        q: "Who are the top holders of this token: 0x",
        icon: (
          <svg viewBox="0 0 24 24" {...stroke}>
            <path d="M2 19h20l-2-9-4.5 3L12 5 8.5 13 4 10z" />
          </svg>
        ),
      },
    ],
  },
  {
    labelKey: "sidebar.section.wallet",
    items: [
      {
        labelKey: "suggest.analyzeWallet",
        q: "Analyze this Robinhood Chain wallet: 0x",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-wallet" />
          </svg>
        ),
      },
    ],
  },
];

const Chevron = () => (
  <span className="menu-trail" aria-hidden="true">
    ›
  </span>
);

export default function Sidebar({
  chats,
  activeId,
  collapsed,
  onCollapse,
  onNewChat,
  onIncognitoChat,
  onLoadChat,
  onDeleteChat,
  onSuggest,
  onOpenSettings,
}) {
  const auth = useAuth();
  const { t, activeLang, setActiveLang, languages } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const langBtnRef = useRef(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setLangMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu();
    }
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      /* Escape backs out of the submenu first, then the menu — otherwise the
         submenu is a trap for anyone not using a mouse. */
      if (langMenuOpen) {
        setLangMenuOpen(false);
        langBtnRef.current?.focus();
      } else {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, langMenuOpen]);

  const userLabel = auth?.user
    ? auth.user.provider === "wallet"
      ? shortAddr(auth.user.address)
      : auth.user.email || auth.user.name
    : t("menu.personal");

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-header">
        <div className="logo-badge">
          <Image src="/logo-128.png" alt={t("a11y.logoAlt")} width={34} height={34} />
        </div>
        <div className="brand-name">{APP_NAME}</div>
        <button className="icon-btn" title={t("sidebar.settings")} aria-label={t("sidebar.settings")} onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" {...stroke}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button className="icon-btn" title={t("sidebar.collapse")} aria-label={t("sidebar.collapse")} onClick={onCollapse}>
          <svg viewBox="0 0 24 24">
            <use href="#i-panel" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 12px 16px" }}>
        <button className="new-chat-btn" onClick={onNewChat} style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("sidebar.newChat")}
        </button>
        <button
          className="new-chat-btn incognito-btn"
          onClick={onIncognitoChat}
          style={{ width: 44, padding: 0, justifyContent: "center", background: "var(--bg-chip)", border: "1px solid var(--border)", color: "var(--text)" }}
          title={t("sidebar.incognitoChat")}
          aria-label={t("sidebar.incognitoChat")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <use href="#i-ghost" />
          </svg>
        </button>
      </div>

      <div className="sidebar-scroll">
        <div className="section-label">{t("sidebar.recent")}</div>
        <div>
          {activeId === null && (
            <div className="side-item recent-item active" aria-current="page">
              <svg viewBox="0 0 24 24">
                <use href="#i-chat" />
              </svg>
              <span className="lbl">{t("sidebar.newChat")}</span>
            </div>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              className={"side-item recent-item" + (c.id === activeId ? " active" : "")}
              role="button"
              tabIndex={0}
              onClick={() => onLoadChat(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onLoadChat(c.id);
                }
              }}
            >
              <svg viewBox="0 0 24 24">
                <use href="#i-chat" />
              </svg>
              <span className="lbl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {c.incognito && (
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ color: "var(--text-3)" }}>
                    <use href="#i-ghost" />
                  </svg>
                )}
                {c.title}
              </span>
              <button
                className="del"
                title={t("sidebar.deleteChat")}
                aria-label={t("sidebar.deleteChat")}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(c.id);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="section-label" style={{ paddingTop: 18 }}>
          {t("sidebar.suggested")}
        </div>
        {SECTIONS.map((sec) => (
          <div key={sec.labelKey}>
            <div className="subsection-label">
              {sec.x ? (
                <svg viewBox="0 0 24 24">
                  <use href="#i-x" />
                </svg>
              ) : null}
              {t(sec.labelKey)}
            </div>
            {sec.items.map((it) => (
              <button className="side-item" key={it.labelKey} onClick={() => onSuggest(it.q)}>
                {it.icon}
                <span className="lbl">{t(it.labelKey)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer" style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12, position: "relative" }} ref={menuRef}>
        {menuOpen && (
          <div className="popover-menu" role="menu">
            <div className="menu-email">
              {auth?.user ? auth.user.email || auth.user.name || shortAddr(auth.user.address) : userLabel}
            </div>

            <button className="menu-item" role="menuitem" onClick={() => { onOpenSettings(); closeMenu(); }}>
              <svg viewBox="0 0 24 24" {...stroke}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
              {t("menu.settings")}
              <span className="menu-trail">⇧⌘,</span>
            </button>

            <div
              className="submenu-wrap"
              onMouseEnter={() => setLangMenuOpen(true)}
              onMouseLeave={() => setLangMenuOpen(false)}
            >
              {/* Opens rather than toggles: on a mouse, hovering the row has
                  already opened the panel, so a toggle here would close what the
                  pointer just opened. Keyboard and touch (no hover) still open it
                  from a click. Escape, an outside click, or picking a language close it. */}
              <button
                ref={langBtnRef}
                className="menu-item"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={langMenuOpen}
                onClick={() => setLangMenuOpen(true)}
              >
                <svg viewBox="0 0 24 24" {...stroke}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {t("menu.language")}
                <Chevron />
              </button>

              {langMenuOpen && (
                <div className="submenu-panel" role="menu">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className="menu-item"
                      role="menuitemradio"
                      aria-checked={activeLang === lang.code}
                      onClick={() => {
                        setActiveLang(lang.code);
                        closeMenu();
                      }}
                    >
                      {lang.label}
                      {activeLang === lang.code && (
                        <span className="menu-check">
                          <svg viewBox="0 0 24 24" {...stroke}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="menu-item" role="menuitem" disabled>
              <svg viewBox="0 0 24 24" {...stroke}>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              {t("menu.getHelp")}
              <span className="menu-badge">{t("menu.soon")}</span>
            </button>

            <div className="menu-divider" />

            <button className="menu-item" role="menuitem" disabled>
              <svg viewBox="0 0 24 24" {...stroke}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 16 16 12 12 8" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {t("menu.upgrade")}
              <span className="menu-badge">{t("menu.soon")}</span>
            </button>
            <button className="menu-item" role="menuitem" disabled>
              <svg viewBox="0 0 24 24" {...stroke}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t("menu.getApps")}
              <span className="menu-badge">{t("menu.soon")}</span>
            </button>
            <button className="menu-item" role="menuitem" disabled>
              <svg viewBox="0 0 24 24" {...stroke}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {t("menu.learnMore")}
              <span className="menu-badge">{t("menu.soon")}</span>
            </button>

            <div className="menu-divider" />
            <button className="menu-item" role="menuitem" onClick={auth?.logout} disabled={auth?.busy === "logout"}>
              <svg viewBox="0 0 24 24" {...stroke}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {auth?.busy === "logout" ? t("menu.loggingOut") : t("menu.logout")}
            </button>
          </div>
        )}

        <button
          className="user-menu-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        >
          <div className="user-avatar">
            {auth?.user?.name?.[0]?.toUpperCase() || auth?.user?.email?.[0]?.toUpperCase() || "N"}
          </div>
          <div className="user-menu-info">
            <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
              {userLabel}
            </span>
            <span className="user-menu-plan">{t("menu.freeTier")}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
