"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/I18nContext";

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

/* Only "general" is implemented; the rest exist to mirror the shape of the full
   product and render the Coming Soon panel. */
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
  offline: "settings.status.offline",
  demo: "settings.status.demo",
};

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
  const [activeTab, setActiveTab] = useState("general");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      setUrl(localStorage.getItem("hoodscope.backend") || localStorage.getItem("ranger.backend") || "");
    } catch {
      setUrl("");
    }
  }, [open]);

  if (!open) return null;

  const activeLabel = TAB_GROUPS.flatMap((g) => g.tabs).find((tab) => tab.id === activeTab)?.labelKey;

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
                    <span>{t(STATUS_KEY[backendStatus?.kind] || STATUS_KEY.demo)}</span>
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
          ) : (
            <div className="settings-empty">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 8 12 12 14 14" />
              </svg>
              <h3>{t("settings.comingSoon")}</h3>
              <p>{t("settings.comingSoonDesc")}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
