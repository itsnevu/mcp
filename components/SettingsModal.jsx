"use client";

import { useEffect, useState } from "react";

export default function SettingsModal({ open, onClose, statusLive, onSaveTest, onClearChats }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (open) {
      try {
        setUrl(localStorage.getItem("ranger.backend") || "");
      } catch {
        setUrl("");
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Settings</h3>
        <div className="sub">Connect Ranger to a live backend (Claude API + robinx-mcp) or run in demo mode.</div>
        <label>Backend URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://my-backend.example.com — leave empty for this Next.js app"
        />
        <label>Status</label>
        <div className="sub" style={{ marginBottom: 0 }}>
          {statusLive
            ? "✓ Connected — answers come from /api/chat."
            : "Demo mode — /api/chat is unreachable, using the built-in client-side demo agent."}
        </div>
        <div className="modal-row">
          <button className="btn danger" onClick={onClearChats}>
            Clear all chats
          </button>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn primary" onClick={() => onSaveTest(url.trim().replace(/\/+$/, ""))}>
            Save &amp; test
          </button>
        </div>
      </div>
    </div>
  );
}
