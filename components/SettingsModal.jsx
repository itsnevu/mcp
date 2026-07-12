"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/chatContract";
import { useI18n } from "@/lib/I18nContext";

const TABS = {
  Settings: [
    { id: "general", label: "General", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg> },
    { id: "account", label: "Account", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: "privacy", label: "Privacy", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { id: "billing", label: "Billing", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { id: "capabilities", label: "Capabilities", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/></svg> },
    { id: "reflect", label: "Reflect", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 4v-4H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h14Z"/></svg> },
    { id: "time", label: "Time and focus", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
    { id: "code", label: "Claude Code", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
  ],
  Customize: [
    { id: "skills", label: "Skills", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
    { id: "connectors", label: "Connectors", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="14" width="8" height="8" rx="2" ry="2"/><rect x="14" y="2" width="8" height="8" rx="2" ry="2"/><line x1="6" y1="14" x2="6" y2="10"/><line x1="18" y1="10" x2="18" y2="14"/><line x1="6" y1="10" x2="18" y2="10"/></svg> },
    { id: "plugins", label: "Plugins", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  ]
};

export default function SettingsModal({ open, onClose, backendStatus, onSaveTest, onClearChats, theme, onThemeChange, activeLang, onLangChange, languages }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("general");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (open) {
      try {
        setUrl(localStorage.getItem("hoodscope.backend") || localStorage.getItem("ranger.backend") || "");
      } catch {
        setUrl("");
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <aside className="settings-sidebar">
          {Object.entries(TABS).map(([groupName, items]) => (
            <div key={groupName} className="settings-sidebar-group">
              <div className="settings-sidebar-label">{groupName}</div>
              {items.map(item => (
                <button
                  key={item.id}
                  className={`settings-sidebar-tab ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="settings-content">
          <button className="settings-close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {activeTab === "general" ? (
            <div>
              <h2>General</h2>
              
              <div className="settings-group">
                <div className="settings-group-label">Appearance</div>
                <div className="settings-group-content">
                  <div className="segmented-control">
                    <button className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => onThemeChange({target: {value: 'dark'}})}>Dark</button>
                    <button className={`segmented-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => onThemeChange({target: {value: 'light'}})}>Light</button>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-label">Language</div>
                <div className="settings-group-content">
                  <div className="segmented-control">
                    {(languages || []).map(lang => (
                      <button key={lang} className={`segmented-btn ${activeLang === lang ? 'active' : ''}`} onClick={() => onLangChange(lang)}>{lang}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-label">Backend URL</div>
                <div className="settings-group-content">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t("settings.backendPlaceholder")}
                    style={{ width: "100%", padding: "10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text)" }}
                  />
                  <div className="sub" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <span>Status: {backendStatus?.kind === "live" ? t("settings.status.live") : backendStatus?.kind === "ready" ? t("settings.status.ready") : backendStatus?.kind === "offline" ? t("settings.status.offline") : t("settings.status.demo")}</span>
                    <button className="btn primary" onClick={() => onSaveTest(url.trim().replace(/\/+$/, ""))} style={{ padding: "4px 12px", minHeight: "32px", fontSize: "13px" }}>
                      {t("settings.save")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-label">Data</div>
                <div className="settings-group-content">
                  <button className="btn danger" onClick={onClearChats} style={{ width: "fit-content" }}>
                    {t("settings.clearChats")}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-3)" }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px", opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
              </svg>
              <h3 style={{ marginBottom: "8px", color: "var(--text)" }}>Coming Soon</h3>
              <p>This setting panel is not available yet in this preview.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
