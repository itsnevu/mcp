"use client";

import { useEffect, useState } from "react";

import { APP_NAME } from "@/lib/chatContract";

export default function SettingsModal({ open, onClose, backendStatus, onSaveTest, onClearChats }) {
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
        <h3>Settings</h3>
        <div className="sub">Connect {APP_NAME} to a live backend (Claude API + robinx-mcp) or run in demo mode.</div>
        <label>Backend URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://my-backend.example.com — leave empty for this Next.js app"
        />
        <label>Status</label>
        <div className="sub" style={{ marginBottom: 0 }}>
          {backendStatus?.kind === "live"
            ? "Live data — answers are coming from Claude plus RobinX MCP."
            : backendStatus?.kind === "ready"
              ? "Live ready — backend is configured and waiting for a chat request."
              : backendStatus?.kind === "offline"
                ? "Backend unreachable — the browser is using the built-in demo agent."
                : "Demo mode — /api/chat is reachable but live credentials are not configured."}
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
