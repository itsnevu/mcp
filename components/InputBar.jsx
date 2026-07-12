"use client";

import { useEffect, useRef, useState } from "react";
import { COMMANDS } from "@/lib/commands";
import { useI18n } from "@/lib/I18nContext";

/* `name` is the wire value sent to /api/chat (see MODES in lib/chatContract.js)
   and must not be translated; labelKey/descKey are what the user reads. */
const MODES = [
  { name: "Auto", labelKey: "mode.auto.label", descKey: "mode.auto.desc", svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> },
  { name: "Fast", labelKey: "mode.fast.label", descKey: "mode.fast.desc", svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
  { name: "Deep", labelKey: "mode.deep.label", descKey: "mode.deep.desc", svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> },
];

export default function InputBar({
  draft,
  setDraft,
  busy,
  onSend,
  onStop,
  mode,
  setMode,
  docked,
  inputRef,
  showToast,
  isIncognito,
}) {
  const { t } = useI18n();
  const [modeOpen, setModeOpen] = useState(false);
  const [cmdSel, setCmdSel] = useState(0);
  const [cmdDismissed, setCmdDismissed] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const unitRef = useRef(null);

  const cmdMatches =
    draft.startsWith("/") && !draft.includes(" ")
      ? COMMANDS.filter((c) => c.cmd.startsWith(draft.toLowerCase()))
      : [];
  const cmdOpen = cmdMatches.length > 0 && !cmdDismissed;
  const sel = Math.min(cmdSel, Math.max(0, cmdMatches.length - 1));

  useEffect(() => {
    setCmdDismissed(false);
    setCmdSel(0);
  }, [draft]);

  /* close menus on outside click */
  useEffect(() => {
    const onDocDown = (e) => {
      if (!unitRef.current || !unitRef.current.contains(e.target)) {
        setModeOpen(false);
        setCmdDismissed(true);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const pickCommand = (c) => {
    setCmdDismissed(true);
    if (c.send) {
      onSend(c.template);
      return;
    }
    setDraft(c.template);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.nativeEvent?.isComposing) return; // don't act on IME composition
    if (cmdOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCmdSel((sel + 1) % cmdMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCmdSel((sel - 1 + cmdMatches.length) % cmdMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pickCommand(cmdMatches[sel]);
        return;
      }
      if (e.key === "Escape") {
        setCmdDismissed(true);
        return;
      }
    }
    if (e.key === "Enter" && draft.trim() && !busy) onSend(draft);
  };

  const micClick = () => {
    if (busy) {
      onStop();
      return;
    }
    if (draft.trim()) {
      onSend(draft);
      return;
    }
    if (listening) {
      recRef.current?.stop(); // second tap stops capture — no double-start
      return;
    }
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      inputRef.current?.focus();
      showToast(t("toast.voiceUnsupported"));
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.onresult = (e) => setDraft(e.results[0][0].transcript);
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const hasText = draft.trim().length > 0;
  const micClass =
    "mic-btn" + (busy ? " stop-mode" : hasText ? " send-mode" : "") + (listening ? " listening" : "");

  return (
    <div className={`input-unit ${docked ? "docked" : "home"} ${isIncognito ? "incognito" : ""}`} ref={unitRef}>
      {cmdOpen && (
        <div className="cmd-menu open">
          {cmdMatches.map((c, i) => (
            <button
              key={c.cmd}
              className={"cmd-item" + (i === sel ? " sel" : "")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickCommand(c)}
            >
              <span className="cmd-name">{c.cmd}</span>
              <span className="cmd-desc">{t(c.descKey)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="input-bar">
        <div className="mode-wrap">
          <button className="mode-btn" onClick={() => setModeOpen((o) => !o)}>
            {(MODES.find((m) => m.name === mode) || MODES[0]).svg}
            <span>{t((MODES.find((m) => m.name === mode) || MODES[0]).labelKey)}</span>
          </button>
          {modeOpen && (
            <div className="mode-menu open">
              {MODES.map((m) => (
                <button
                  key={m.name}
                  className="mode-option"
                  onClick={() => {
                    setMode(m.name);
                    setModeOpen(false);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {m.svg}
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      {t(m.labelKey)}
                      <small>{t(m.descKey)}</small>
                    </span>
                  </span>
                  <span className="check" style={{ visibility: mode === m.name ? "visible" : "hidden" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: 14, height: 14}}><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="input-divider" />

        <input
          className="chat-input"
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("input.placeholder")}
          autoComplete="off"
          spellCheck={false}
        />

        <button className={micClass} onClick={micClick} title={t("input.micTitle")} aria-label={t("input.micAria")}>
          {busy ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : hasText ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
