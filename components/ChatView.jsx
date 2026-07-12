"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import Widget from "./Widgets";
import { renderRich, fmtTime, replyToText } from "@/lib/text";
import { useI18n } from "@/lib/I18nContext";

function UserMessage({ msg }) {
  const { t } = useI18n();
  return (
    <div className="msg user">
      <div className="avatar">{t("chat.you")}</div>
      <div className="bubble">
        {msg.content}
        <div className="msg-time">{fmtTime(msg.ts)}</div>
      </div>
    </div>
  );
}

function AgentMessage({ msg, animate, onStart, abortRef, onDone, showToast, scrollBottom }) {
  const { t } = useI18n();
  const reply = msg.content;
  const isWidget = typeof reply === "object" && reply !== null && reply.kind && reply.kind !== "text";
  const intro =
    typeof reply === "string" ? reply : reply?.kind === "text" ? reply.text : reply?.intro || "";
  const fullHtml = renderRich(intro || "");
  // typed === null → fully rendered; otherwise the partial typewriter HTML
  const [typed, setTyped] = useState(animate ? "" : null);

  useEffect(() => {
    if (!animate) return;
    onStart(); // consume the one-shot animate flag so re-renders don't re-animate
    let cancelled = false;
    (async () => {
      const words = fullHtml.split(/(?=\s)/);
      for (let i = 0; i < words.length; i++) {
        if (cancelled) return;
        if (abortRef.current) break; // stop button pressed
        setTyped(words.slice(0, i + 1).join(""));
        scrollBottom();
        await new Promise((r) => setTimeout(r, 13));
      }
      if (!cancelled) {
        setTyped(null);
        scrollBottom();
        onDone();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = typed === null;

  return (
    <div className="msg agent">
      <div className="avatar">
        <Image src="/logo-128.png" alt="" width={34} height={34} />
      </div>
      <div className="bubble">
        {intro ? <div className="txt" dangerouslySetInnerHTML={{ __html: done ? fullHtml : typed }} /> : null}
        {isWidget && done ? <Widget reply={reply} /> : null}
        <div className="msg-time">{fmtTime(msg.ts)}</div>
        <button
          className="copy-btn"
          title={t("chat.copy")}
          aria-label={t("chat.copyAria")}
          onClick={() =>
            navigator.clipboard?.writeText(replyToText(reply)).then(() => showToast(t("toast.copied")))
          }
        >
          <svg viewBox="0 0 24 24">
            <use href="#i-copy" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const MODELS = [
  { id: "Bugglo V1", descKey: "model.buggloV1.desc" },
  { id: "Bugglo Pro", descKey: "model.buggloPro.desc" },
  { id: "Claude Opus 4.8", descKey: "model.sonnet.desc" },
  { id: "Fable", descKey: "model.fable.desc" },
  { id: "GPT-4o", descKey: "model.gpt4o.desc" },
];

export default function ChatView({
  messages,
  awaiting,
  animateIds,
  abortRef,
  onTypingDone,
  showToast,
  scrollBottom,
}) {
  const { t } = useI18n();
  const [modelOpen, setModelOpen] = useState(false);
  const [activeModel, setActiveModel] = useState("Bugglo V1");
  const modelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (modelRef.current && !modelRef.current.contains(e.target)) {
        setModelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="chat-wrap">
      <div className="model-selector-wrap" ref={modelRef}>
        <button className="model-btn" onClick={() => setModelOpen(!modelOpen)}>
          {activeModel}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        {modelOpen && (
          <div className="model-popover">
            {MODELS.map(m => (
              <button 
                key={m.id} 
                className={"model-item" + (activeModel === m.id ? " active" : "")}
                onClick={() => { setActiveModel(m.id); setModelOpen(false); }}
              >
                <div className="model-item-title">
                  {m.id}
                  {activeModel === m.id && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent)"}}><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div className="model-item-desc">{t(m.descKey)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {messages.map((m) =>
        m.role === "user" ? (
          <UserMessage key={m.id} msg={m} />
        ) : (
          <AgentMessage
            key={m.id}
            msg={m}
            animate={animateIds.current.has(m.id)}
            onStart={() => animateIds.current.delete(m.id)}
            abortRef={abortRef}
            onDone={onTypingDone}
            showToast={showToast}
            scrollBottom={scrollBottom}
          />
        )
      )}
      {awaiting && (
        <div className="msg agent">
          <div className="avatar">
            <Image src="/logo-128.png" alt="" width={34} height={34} />
          </div>
          <div className="bubble">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
