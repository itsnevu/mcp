"use client";

/* Sidebar: brand, New Chat, persistent recents, suggested prompts, socials */
import Image from "next/image";
import { APP_NAME } from "@/lib/chatContract";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const SECTIONS = [
  {
    label: "Sentiment",
    x: true,
    items: [
      {
        label: "Search a ticker on 𝕏",
        q: "Search $HOOD ticker sentiment on X",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-search" />
          </svg>
        ),
      },
      {
        label: "Trending tickers on 𝕏",
        q: "What are the trending tickers on X right now?",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-trend" />
          </svg>
        ),
      },
      {
        label: "Top 𝕏 accounts for a ticker",
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
        label: "Robinhood Chain trending on 𝕏",
        q: "What's trending about Robinhood Chain on X?",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-sparkle" />
          </svg>
        ),
      },
      {
        label: "FUD detection for a ticker",
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
        label: "Community sentiment for a ticker",
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
    label: "Market",
    items: [
      {
        label: "Top trending Robinhood Chain tokens",
        q: "Top trending Robinhood Chain tokens today",
        icon: (
          <svg viewBox="0 0 24 24" {...stroke}>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        ),
      },
      {
        label: "Latest DEX tokens on Robinhood Chain",
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
    label: "Security",
    items: [
      {
        label: "Rug check a contract",
        q: "Rug check this contract: 0x",
        icon: (
          <svg viewBox="0 0 24 24">
            <use href="#i-shield" />
          </svg>
        ),
      },
      {
        label: "Top holders of a token",
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
    label: "Wallet",
    items: [
      {
        label: "Analyze a Robinhood Chain wallet",
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

export default function Sidebar({
  chats,
  activeId,
  collapsed,
  onCollapse,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  onSuggest,
  onOpenSettings,
}) {
  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-header">
        <div className="logo-badge">
          <Image src="/logo-128.png" alt={`${APP_NAME} logo`} width={34} height={34} />
        </div>
        <div className="brand-name">{APP_NAME}</div>
        <button className="icon-btn" title="Settings" aria-label="Settings" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" {...stroke}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button className="icon-btn" title="Collapse sidebar" aria-label="Collapse sidebar" onClick={onCollapse}>
          <svg viewBox="0 0 24 24">
            <use href="#i-panel" />
          </svg>
        </button>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Chat
      </button>

      <div className="sidebar-scroll">
        <div className="section-label">Recent</div>
        <div>
          {activeId === null && (
            <div className="side-item recent-item active" role="button" tabIndex={0}>
              <svg viewBox="0 0 24 24">
                <use href="#i-chat" />
              </svg>
              <span className="lbl">New Chat</span>
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
              <span className="lbl">{c.title}</span>
              <button
                className="del"
                title="Delete chat"
                aria-label={`Delete chat: ${c.title}`}
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
          Suggested
        </div>
        {SECTIONS.map((sec) => (
          <div key={sec.label}>
            <div className="subsection-label">
              {sec.x ? (
                <svg viewBox="0 0 24 24">
                  <use href="#i-x" />
                </svg>
              ) : null}
              {sec.label}
            </div>
            {sec.items.map((it) => (
              <button className="side-item" key={it.label} onClick={() => onSuggest(it.q)}>
                {it.icon}
                <span className="lbl">{it.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          className="social-btn"
          title="X"
          aria-label="X"
          onClick={() => window.open("https://x.com/search?q=Robinhood%20Chain", "_blank", "noopener,noreferrer")}
        >
          <svg viewBox="0 0 24 24">
            <use href="#i-x" />
          </svg>
        </button>
        <button
          className="social-btn"
          title="Telegram"
          aria-label="Telegram"
          onClick={() => window.open("https://telegram.org", "_blank", "noopener,noreferrer")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M21.94 3.15a1.5 1.5 0 0 0-1.53-.26L2.7 9.83a1.5 1.5 0 0 0 .09 2.82l4.55 1.5 1.74 5.58a1.5 1.5 0 0 0 2.55.57l2.44-2.62 4.44 3.28a1.5 1.5 0 0 0 2.37-.9l3-15.38a1.5 1.5 0 0 0-.94-1.53zM9.5 14.4l8.1-7.23-6.5 8.51-.16 3.34z" />
          </svg>
        </button>
        <div className="kbd-hint">
          <kbd>⌘K</kbd> focus · <kbd>/</kbd> commands
        </div>
      </div>
    </aside>
  );
}
