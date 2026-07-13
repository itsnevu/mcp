"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COMMANDS } from "@/lib/commands";
import { useI18n } from "@/lib/I18nContext";
import { FILE_ACCEPT, MAX_ATTACHMENTS } from "@/lib/attachments";
import { speechLangTag } from "@/lib/speech";

/* `name` is the wire value sent to /api/chat (see MODES in lib/chatContract.js)
   and must not be translated; labelKey/descKey are what the user reads. */
const MODES = [
  { name: "Auto", labelKey: "mode.auto.label", descKey: "mode.auto.desc", svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> },
  { name: "Fast", labelKey: "mode.fast.label", descKey: "mode.fast.desc", svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
  { name: "Deep", labelKey: "mode.deep.label", descKey: "mode.deep.desc", svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> },
];

function AttachmentChip({ file, onRemove, removeLabel }) {
  return (
    <div className={"att-chip " + file.kind}>
      {file.kind === "image" ? (
        /* A data: URL has no remote origin for next/image to optimise, and it never leaves
           the browser — <img> is the correct element here. */
        // eslint-disable-next-line @next/next/no-img-element
        <img className="att-thumb" src={file.thumb} alt="" />
      ) : (
        <span className="att-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </span>
      )}
      <span className="att-meta">
        <span className="att-name">{file.name}</span>
        {file.kind === "text" && (
          <span className="att-sub">
            {file.chars.toLocaleString()} chars{file.truncated ? " · trimmed" : ""}
          </span>
        )}
      </span>
      <button className="att-remove" onClick={() => onRemove(file.id)} title={removeLabel} aria-label={removeLabel}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

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
  attachments,
  onAttachFiles,
  onRemoveAttachment,
  onOpenVoice,
}) {
  const { t, activeLang } = useI18n();
  const [modeOpen, setModeOpen] = useState(false);
  const [cmdSel, setCmdSel] = useState(0);
  const [cmdDismissed, setCmdDismissed] = useState(false);
  const [listening, setListening] = useState(false);
  const [dragging, setDragging] = useState(false);
  const recRef = useRef(null);
  const unitRef = useRef(null);
  const fileRef = useRef(null);
  const dragDepth = useRef(0); // dragenter/leave fire per child; a counter is the only stable way

  const files = attachments || [];
  const full = files.length >= MAX_ATTACHMENTS;

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

  /* A send is legal with no text as long as a file came with it — "read this" is a complete
     thought when a PDF is attached. */
  const canSend = draft.trim().length > 0 || files.length > 0;

  const submit = () => {
    if (busy || !canSend) return;
    onSend(draft);
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
    /* Backspace on an empty box pops the last attachment — the same reflex that removes a
       chip in every mail client. */
    if (e.key === "Backspace" && !draft && files.length) {
      onRemoveAttachment(files[files.length - 1].id);
      return;
    }
    if (e.key === "Enter" && canSend && !busy) submit();
  };

  /* ── files: picker, drop, paste ── */

  const takeFiles = useCallback(
    (list) => {
      const picked = Array.from(list || []).filter(Boolean);
      if (picked.length) onAttachFiles(picked);
    },
    [onAttachFiles]
  );

  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    takeFiles(e.dataTransfer?.files);
  };

  const onDragOver = (e) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); // required, or the drop never fires
  };

  const onDragEnter = (e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    dragDepth.current++;
    setDragging(true);
  };

  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  /* Screenshot → ⌘V. The single most common way anyone attaches an image, and the one most
     chat boxes forget. */
  const onPaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const pasted = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (pasted.length) {
      e.preventDefault();
      takeFiles(pasted);
    }
  };

  const openPicker = () => {
    if (full) {
      showToast(t("attach.err.tooMany"));
      return;
    }
    fileRef.current?.click();
  };

  /* ── dictation (the inline mic; the orb button opens the full voice session) ── */

  const micClick = () => {
    if (busy) {
      onStop();
      return;
    }
    if (canSend) {
      submit();
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
    rec.lang = speechLangTag(activeLang); // keep speech recognition aligned with the active locale
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setDraft(text.trim());
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      inputRef.current?.focus();
    };
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  useEffect(() => () => recRef.current?.abort?.(), []); // unmount mid-dictation must free the mic

  const micClass =
    "mic-btn" + (busy ? " stop-mode" : canSend ? " send-mode" : "") + (listening ? " listening" : "");

  return (
    <div
      className={`input-unit ${docked ? "docked" : "home"} ${isIncognito ? "incognito" : ""} ${dragging ? "dragging" : ""}`}
      ref={unitRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
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

      {files.length > 0 && (
        <div className="att-tray">
          {files.map((file) => (
            <AttachmentChip
              key={file.id}
              file={file}
              onRemove={onRemoveAttachment}
              removeLabel={t("attach.remove")}
            />
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

        <button
          className={"attach-btn" + (full ? " full" : "")}
          onClick={openPicker}
          title={t("attach.title")}
          aria-label={t("attach.title")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          className="file-input"
          multiple
          accept={FILE_ACCEPT}
          onChange={(e) => {
            takeFiles(e.target.files);
            e.target.value = ""; // or picking the same file twice in a row is a no-op
          }}
          tabIndex={-1}
          aria-hidden="true"
        />

        <input
          className="chat-input"
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={files.length ? t("input.placeholderFiles") : t("input.placeholder")}
          autoComplete="off"
          spellCheck={false}
        />

        <button className={micClass} onClick={micClick} title={t("input.micTitle")} aria-label={t("input.micAria")}>
          {busy ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : canSend ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          )}
        </button>

        <button
          className="voice-btn"
          onClick={onOpenVoice}
          title={t("voice.open")}
          aria-label={t("voice.open")}
        >
          <span className="voice-btn-orb" />
        </button>
      </div>

      {dragging && (
        <div className="drop-veil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 5 17 10" />
            <line x1="12" y1="5" x2="12" y2="16" />
          </svg>
          <span>{t("attach.drop")}</span>
        </div>
      )}
    </div>
  );
}
