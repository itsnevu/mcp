"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Widget from "./Widgets";
import { renderRich, fmtTime, replyToText } from "@/lib/text";

function UserMessage({ msg }) {
  return (
    <div className="msg user">
      <div className="avatar">You</div>
      <div className="bubble">
        {msg.content}
        <div className="msg-time">{fmtTime(msg.ts)}</div>
      </div>
    </div>
  );
}

function AgentMessage({ msg, animate, onStart, abortRef, onDone, showToast, scrollBottom }) {
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
          title="Copy"
          aria-label="Copy reply"
          onClick={() =>
            navigator.clipboard?.writeText(replyToText(reply)).then(() => showToast("Copied to clipboard"))
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
  return (
    <div className="chat-wrap">
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
