"use client";

import { useCallback, useEffect, useState } from "react";
import { speechSupport } from "@/lib/speech";
import { useI18n } from "@/lib/I18nContext";

const LS_SEEN = "hoodscope.voiceAnnounce.v1";

function alreadySeen() {
  try {
    return localStorage.getItem(LS_SEEN) === "1";
  } catch {
    /* Storage blocked (private mode, cookie wall). Showing it again on the next visit beats
       hiding a feature nobody has found yet. */
    return false;
  }
}

/* The orb button in the input bar is a 30px circle with no label — on its own it does not say
   "this is an AI voice conversation". This is the one-time introduction that does.
   Deliberately NOT a toast: the toast auto-dismisses after 2.2s, and this has to stay up long
   enough to be read and clicked. */
export default function VoiceAnnounce({ voiceOpen, onStart }) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* Never advertise what this browser cannot run. Voice mode needs recognition, and Firefox
       ships synthesis WITHOUT it — a "Start Voice" button that opens straight into "Voice
       unavailable" is worse than no banner at all. */
    if (alreadySeen() || !speechSupport().stt) return;
    setMounted(true);
    /* Let the app paint first. A banner that is already there on the first frame reads as page
       furniture; one that arrives a beat later reads as news. */
    const timer = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(LS_SEEN, "1");
    } catch {}
    setTimeout(() => setMounted(false), 300); // outlast the slide-out, don't cut it off
  }, []);

  /* Opening voice mode by ANY route — this button, the orb, ⌘⇧V — is the discovery this banner
     exists to cause. Once it has happened, the banner has done its job and retires. */
  useEffect(() => {
    if (voiceOpen && mounted) dismiss();
  }, [voiceOpen, mounted, dismiss]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, dismiss]);

  if (!mounted) return null;

  const start = () => {
    dismiss();
    onStart();
  };

  return (
    <div className={"voice-announce" + (show ? " show" : "")} role="status" aria-live="polite">
      <span className="voice-announce-orb" aria-hidden="true" />
      <div className="voice-announce-text">
        <div className="voice-announce-title">{t("announce.voice.title")}</div>
        <div className="voice-announce-body">{t("announce.voice.body")}</div>
      </div>
      <button className="voice-announce-cta" onClick={start}>
        {t("announce.voice.cta")}
      </button>
      <button
        className="voice-announce-x"
        onClick={dismiss}
        title={t("announce.voice.dismiss")}
        aria-label={t("announce.voice.dismiss")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  );
}
