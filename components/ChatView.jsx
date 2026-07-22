"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Widget from "./Widgets";
import { renderRich, fmtTime, replyToText } from "@/lib/text";
import { useI18n } from "@/lib/I18nContext";

/* The thumbnail is the only copy of the image that survives a reload — the full-size data URL
   is deliberately never persisted (see toStoredAttachments). A chat restored from localStorage
   therefore shows the picture but cannot re-send it, which is correct: the model already read
   it on the turn it was attached to. */
function MessageAttachments({ files }) {
  return (
    <div className="msg-atts">
      {files.map((file) =>
        file.kind === "image" && file.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data: URL, already sized
          <img key={file.id} className="msg-att-img" src={file.thumb} alt={file.name} title={file.name} />
        ) : (
          <span key={file.id} className="msg-att-file" title={file.name}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {file.name}
          </span>
        )
      )}
    </div>
  );
}

function UserMessage({ msg }) {
  const { t } = useI18n();
  const files = msg.attachments || [];
  return (
    <div className="msg user">
      <div className="avatar">{t("chat.you")}</div>
      <div className="bubble">
        {files.length > 0 && <MessageAttachments files={files} />}
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

  return (
    <div className="chat-wrap">
      {/* Static brand chip. The engine and its routing (Auto/Fast/Deep) are chosen by the
          mode control in InputBar and pinned server-side (see assertPinnedModel in
          lib/liveAgent.js); there is no user-selectable model, so we do not render a
          picker that cannot change anything. */}
      <div className="model-selector-wrap">
        <span className="model-btn model-btn-static">Bugglo V1</span>
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
