"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/I18nContext";
import { APP_NAME } from "@/lib/chatContract";
import { useAuth } from "./AuthGate";

const icon = {
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const TAB_GROUPS = [
  {
    id: "settings",
    labelKey: "settings.group.settings",
    tabs: [
      { id: "general", labelKey: "tab.general", icon: <svg {...icon}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg> },
      { id: "account", labelKey: "tab.account", icon: <svg {...icon}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
      { id: "privacy", labelKey: "tab.privacy", icon: <svg {...icon}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
      { id: "billing", labelKey: "tab.billing", icon: <svg {...icon}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
      { id: "capabilities", labelKey: "tab.capabilities", icon: <svg {...icon}><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/></svg> },
      { id: "reflect", labelKey: "tab.reflect", icon: <svg {...icon}><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 4v-4H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h14Z"/></svg> },
      { id: "time", labelKey: "tab.time", icon: <svg {...icon}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
      { id: "code", labelKey: "tab.code", icon: <svg {...icon}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
    ],
  },
  {
    id: "customize",
    labelKey: "settings.group.customize",
    tabs: [
      { id: "skills", labelKey: "tab.skills", icon: <svg {...icon}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
      { id: "connectors", labelKey: "tab.connectors", icon: <svg {...icon}><rect x="2" y="14" width="8" height="8" rx="2" ry="2"/><rect x="14" y="2" width="8" height="8" rx="2" ry="2"/><line x1="6" y1="14" x2="6" y2="10"/><line x1="18" y1="10" x2="18" y2="14"/><line x1="6" y1="10" x2="18" y2="10"/></svg> },
      { id: "plugins", labelKey: "tab.plugins", icon: <svg {...icon}><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    ],
  },
];

const STATUS_KEY = {
  live: "settings.status.live",
  ready: "settings.status.ready",
  degraded: "settings.status.degraded",
  offline: "settings.status.offline",
};

const CONNECTORS = [
  ["RobinX MCP", "Core chain intelligence tools"],
  ["Boar basic", "Robinhood Chain market and token data"],
  ["Boar advanced", "Deeper contract and holder analysis"],
  ["Boo Crypto", "Crypto research tools"],
  ["DexScreener", "Market pairs and liquidity"],
  ["Fuse", "Cross-chain supporting data"],
  ["Whale Intel", "Premium whale intelligence, requires WHALE_INTEL_KEY"],
  ["Etherscan", "EVM explorer tools, requires ETHERSCAN_API_KEY"],
  ["Hood Domains", ".hood name resolution"],
];

function Stat({ label, value, note }) {
  return (
    <div className="settings-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function Bar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="settings-meter" aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function CodeLine({ children }) {
  return <code className="settings-code-line">{children}</code>;
}

export default function SettingsModal({
  open,
  onClose,
  backendStatus,
  onSaveTest,
  onClearChats,
  theme,
  onThemeChange,
}) {
  const { t, activeLang, setActiveLang, languages } = useI18n();
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [url, setUrl] = useState("");
  const [usage, setUsage] = useState(null);
  const [health, setHealth] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (!open) return;
    try {
      setUrl(localStorage.getItem("hoodscope.backend") || localStorage.getItem("ranger.backend") || "");
    } catch {
      setUrl("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUsage(true);
    fetch("/api/usage", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUsage(data?.ok ? data : null);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingUsage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const activeLabel = TAB_GROUPS.flatMap((g) => g.tabs).find((tab) => tab.id === activeTab)?.labelKey;
  const user = auth?.user;
  const quota = usage?.usage;
  const backend = url.trim().replace(/\/+$/, "");
  const probeHealth = async () => {
    setProbing(true);
    try {
      const res = await fetch(`${backend}/api/health?probe=1`, { cache: "no-store" });
      setHealth(await res.json().catch(() => null));
    } catch {
      setHealth(null);
    } finally {
      setProbing(false);
    }
  };

  const panel = {
    account: (
      <>
        <div className="settings-content-sub">Signed-in identity and session controls for this browser.</div>
        <div className="settings-grid">
          <Stat label="Provider" value={user?.provider || "unknown"} />
          <Stat label="Name" value={user?.name || user?.email || user?.address || "Guest"} />
          <Stat label="Email" value={user?.email || "Not connected"} />
          <Stat label="Wallet" value={user?.address || "Not connected"} />
        </div>
        <div className="settings-group">
          <div className="settings-group-label">Session</div>
          <div className="settings-group-content">
            <p className="settings-copy">
              Guest sessions last 24 hours and are metered by source IP. Google and wallet sessions last 7 days
              and receive the signed-in quota tier.
            </p>
            <div className="settings-actions">
              <button className="btn ghost" onClick={auth?.logout} disabled={auth?.busy === "logout"}>
                {auth?.busy === "logout" ? t("menu.loggingOut") : t("menu.logout")}
              </button>
            </div>
          </div>
        </div>
      </>
    ),
    privacy: (
      <>
        <div className="settings-content-sub">Privacy controls that are active in this build.</div>
        <div className="settings-list">
          <div>
            <strong>Incognito chats</strong>
            <span>Kept in memory only, excluded from localStorage, and still sent to the backend for a reply.</span>
          </div>
          <div>
            <strong>Attachments</strong>
            <span>Images are downscaled before upload; PDFs are converted to text in the browser when possible.</span>
          </div>
          <div>
            <strong>External processing</strong>
            <span>Chat text, attachments, and voice transcripts are sent to the configured engine when needed.</span>
          </div>
        </div>
        <div className="settings-group">
          <div className="settings-group-label">{t("settings.data")}</div>
          <div className="settings-group-content">
            <p className="settings-copy">This deletes saved non-incognito chats from this browser. Server-side quota counters are not reset.</p>
            <div className="settings-actions">
              <button className="btn danger" onClick={onClearChats}>{t("settings.clearChats")}</button>
            </div>
          </div>
        </div>
      </>
    ),
    billing: (
      <>
        <div className="settings-content-sub">Usage is metered before every live engine call, so the bill has a hard daily ceiling.</div>
        {loadingUsage ? (
          <div className="settings-empty"><h3>Loading usage…</h3></div>
        ) : quota ? (
          <>
            <div className="settings-grid">
              <Stat label="Tier" value={quota.guest ? "Guest" : "Signed in"} />
              <Stat label="Requests today" value={`${quota.user.requestsToday} / ${quota.user.requestsPerDay}`} />
              <Stat label="User spend today" value={`$${quota.user.spentUsdToday} / $${quota.user.capUsdToday}`} />
              <Stat label="Global spend today" value={`$${quota.global.spentUsdToday} / $${quota.global.capUsdToday}`} />
            </div>
            <Bar value={quota.user.spentUsdToday} max={quota.user.capUsdToday} />
            <p className="settings-copy">
              No subscription or card flow is wired in this build. Paid tool access is controlled by server wallet
              configuration, and guest limits lift when the user signs in.
            </p>
          </>
        ) : (
          <div className="settings-empty"><h3>Usage unavailable</h3><p>Sign in again to refresh quota data.</p></div>
        )}
      </>
    ),
    capabilities: (
      <>
        <div className="settings-content-sub">Live engine, MCP fleet, price feed, voice, files, and wallet auth readiness.</div>
        <div className="settings-grid">
          <Stat label="Chat backend" value={t(backendStatus?.labelKey || "status.offline")} />
          <Stat label="Voice" value={"Browser speech API"} />
          <Stat label="Files" value={"Images, PDFs, text"} />
          <Stat label="Wallets" value={"MetaMask, Phantom"} />
        </div>
        <div className="settings-actions">
          <button className="btn ghost" onClick={probeHealth} disabled={probing}>
            {probing ? "Probing…" : "Probe MCP health"}
          </button>
        </div>
        {health ? (
          <div className="settings-list">
            <div><strong>Engine</strong><span>{String(Boolean(health.capabilities?.engine))}</span></div>
            <div><strong>MCP</strong><span>{health.capabilities?.mcp || "unknown"} · {health.capabilities?.mcpTools || 0} tools</span></div>
            <div><strong>Paid tools</strong><span>{health.capabilities?.paidToolsEnabled ? "Enabled" : "Disabled"}</span></div>
          </div>
        ) : null}
      </>
    ),
    reflect: (
      <>
        <div className="settings-content-sub">Operational notes for reviewing answers instead of trusting them blindly.</div>
        <div className="settings-list">
          <div><strong>Source badge</strong><span>Live data, tools offline, and backend offline are separated.</span></div>
          <div><strong>Widget validation</strong><span>Malformed backend replies are rejected before rendering.</span></div>
          <div><strong>Financial safety</strong><span>State-changing MCP tools are filtered unless explicitly allowlisted server-side.</span></div>
        </div>
      </>
    ),
    time: (
      <>
        <div className="settings-content-sub">Latency and focus controls currently enforced by the app.</div>
        <div className="settings-grid">
          <Stat label="Client timeout" value="90s" />
          <Stat label="Server hard deadline" value="45s default" />
          <Stat label="Fast mode" value="2 iterations" />
          <Stat label="Deep mode" value="6 iterations" />
        </div>
        <p className="settings-copy">Use Fast for lightweight lookups and Deep when the answer needs multiple MCP tool passes.</p>
      </>
    ),
    code: (
      <>
        <div className="settings-content-sub">API surface exposed by this deployment.</div>
        <div className="settings-code">
          <CodeLine>POST /api/chat</CodeLine>
          <CodeLine>GET /api/health?probe=1</CodeLine>
          <CodeLine>GET /api/prices</CodeLine>
          <CodeLine>GET /api/usage</CodeLine>
        </div>
        <p className="settings-copy">The reply contract is documented on the Docs page; invalid shapes never reach the chat renderer.</p>
      </>
    ),
    skills: (
      <>
        <div className="settings-content-sub">Built-in skills available to the agent surface.</div>
        <div className="settings-list">
          <div><strong>Rug check</strong><span>Contract, liquidity, deployer and holder risk.</span></div>
          <div><strong>Market scan</strong><span>Trending, price, liquidity and social signal.</span></div>
          <div><strong>Wallet analysis</strong><span>Wallet flags, stats and exposure summaries.</span></div>
        </div>
      </>
    ),
    connectors: (
      <>
        <div className="settings-content-sub">MCP connectors configured in mcp.json. Availability depends on remote health and env keys.</div>
        <div className="settings-list">
          {CONNECTORS.map(([name, desc]) => (
            <div key={name}><strong>{name}</strong><span>{desc}</span></div>
          ))}
        </div>
      </>
    ),
    plugins: (
      <>
        <div className="settings-content-sub">Extension policy for this build.</div>
        <div className="settings-list">
          <div><strong>No user-installed plugins yet</strong><span>The production app only loads server-owned MCP entries from mcp.json.</span></div>
          <div><strong>Allowlist enforced</strong><span>Mutating tools are stripped unless a connector explicitly opts in server-side.</span></div>
        </div>
      </>
    ),
  };

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label={t("settings.title")}>
        <aside className="settings-sidebar">
          {TAB_GROUPS.map((group) => (
            <div key={group.id} className="settings-sidebar-group">
              <div className="settings-sidebar-label">{t(group.labelKey)}</div>
              {group.tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={"settings-sidebar-tab" + (activeTab === tab.id ? " active" : "")}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="settings-content">
          <button className="settings-close-btn" onClick={onClose} aria-label={t("settings.close")}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <h2>{t(activeLabel)}</h2>

          {activeTab === "general" ? (
            <>
              <div className="settings-content-sub">{t("settings.appearanceDesc")}</div>

              <div className="settings-group">
                <div className="settings-group-label">{t("settings.appearance")}</div>
                <div className="settings-group-content">
                  <div className="segmented-control">
                    <button
                      className={"segmented-btn" + (theme === "dark" ? " active" : "")}
                      onClick={() => onThemeChange("dark")}
                    >
                      {t("theme.dark")}
                    </button>
                    <button
                      className={"segmented-btn" + (theme === "light" ? " active" : "")}
                      onClick={() => onThemeChange("light")}
                    >
                      {t("theme.light")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-label">
                  {t("settings.language")}
                  <div className="settings-group-desc">{t("settings.languageDesc")}</div>
                </div>
                <div className="settings-group-content">
                  <select
                    className="settings-select"
                    value={activeLang}
                    onChange={(e) => setActiveLang(e.target.value)}
                    aria-label={t("settings.language")}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-label">
                  {t("settings.backendUrl")}
                  <div className="settings-group-desc">{t("settings.backendDesc")}</div>
                </div>
                <div className="settings-group-content">
                  <input
                    className="settings-input"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t("settings.backendPlaceholder")}
                    aria-label={t("settings.backendUrl")}
                  />
                  <div className="settings-status">
                    <b>{t("settings.statusPrefix")}</b>
                    <span>{t(STATUS_KEY[backendStatus?.kind] || STATUS_KEY.offline)}</span>
                  </div>
                  <div className="settings-actions">
                    <button className="btn primary" onClick={() => onSaveTest(url.trim().replace(/\/+$/, ""))}>
                      {t("settings.save")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-label">
                  {t("settings.data")}
                  <div className="settings-group-desc">{t("settings.dataDesc")}</div>
                </div>
                <div className="settings-group-content">
                  <div className="settings-actions">
                    <button className="btn danger" onClick={onClearChats}>
                      {t("settings.clearChats")}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : panel[activeTab] || (
            <div className="settings-empty">
              <h3>{APP_NAME}</h3>
              <p>This panel has no runtime data yet.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
