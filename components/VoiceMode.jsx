"use client";

/* Hands-free voice conversation.
 *
 * The loop is: listen → (silence) → send → think → speak → listen again, with no button
 * presses in between. Two things make that feel like a conversation rather than a dictation
 * box, and both are worth protecting:
 *
 *   1. END-OF-TURN IS SILENCE, NOT A TAP. SpeechRecognition streams interim results; when they
 *      stop arriving for SILENCE_MS the turn is over. Waiting for the engine's own `isFinal`
 *      instead adds a second of dead air and drops the last clause on some platforms.
 *   2. THE ORB IS THE STATUS. It reacts to the real microphone RMS while listening, so the
 *      user can see they are being heard — the single thing that makes a voice UI feel alive
 *      instead of broken.
 *
 * Interruption is a TAP, not a shout: barge-in on microphone level sounds great until the mic
 * hears the assistant's own voice through the laptop speaker and the two fight. Echo
 * cancellation mostly handles it, and "mostly" is not good enough for a feature that would
 * cut itself off mid-sentence. Tap the orb, and she stops.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/I18nContext";
import { replyToText } from "@/lib/text";
import { createLevelMeter, createRecognizer, createSpeaker, speechSupport, toSpeech } from "@/lib/speech";

/* Long enough that a pause for breath mid-sentence is not treated as the end of a thought,
   short enough that the reply does not feel late. */
const SILENCE_MS = 1250;

function hexToRgb(hex) {
  const clean = String(hex || "").trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [1, 62, 245]; // brand blue, if the var is missing
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function VoiceMode({ open, onClose, onSend }) {
  const { t, activeLang } = useI18n();

  const [phase, setPhase] = useState("idle"); // idle | listening | thinking | speaking | error
  const [caption, setCaption] = useState("");
  const [spoken, setSpoken] = useState("");
  const [muted, setMuted] = useState(false);
  const [errorKey, setErrorKey] = useState("");

  const canvasRef = useRef(null);
  const recRef = useRef(null);
  const speakerRef = useRef(null);
  const meterRef = useRef(null);
  const silenceRef = useRef(null);
  const finalRef = useRef("");
  /* The interim transcript lives in a ref, not in state, because the silence timer reads it
     from inside a recognizer callback — and a callback registered three renders ago would
     otherwise read the `caption` that existed when it was registered, i.e. "". That is the
     bug where you talk, pause, and nothing is ever sent. */
  const interimRef = useRef("");
  const phaseRef = useRef("idle");
  const closingRef = useRef(false);
  const mutedRef = useRef(false);
  const levelRef = useRef(0);
  const restartRef = useRef(0);
  /* endTurn and startListening call each other, which no pair of useCallbacks can express
     without a circular dependency array. One indirection through a ref breaks it. */
  const endTurnRef = useRef(() => {});

  const setPhaseBoth = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearSilence = () => {
    clearTimeout(silenceRef.current);
    silenceRef.current = null;
  };

  /* ── listening ─────────────────────────────────────────────────────────── */

  const startListening = useCallback(() => {
    if (closingRef.current || mutedRef.current) return;

    clearSilence();
    finalRef.current = "";
    interimRef.current = "";
    setCaption("");
    setSpoken("");

    /* The turn ends when the user stops talking, so every scrap of speech — interim or final —
       pushes the deadline back. Waiting for the engine's own end-of-speech instead costs a
       second of dead air and drops the last clause on some platforms. */
    const armSilence = () => {
      clearSilence();
      silenceRef.current = setTimeout(() => {
        const text = (finalRef.current || interimRef.current || "").trim();
        if (text) endTurnRef.current(text);
      }, SILENCE_MS);
    };

    const rec = createRecognizer({
      lang: activeLang,
      onInterim: (text) => {
        interimRef.current = (finalRef.current + " " + text).trim();
        setCaption(interimRef.current);
        armSilence();
      },
      onFinal: (text) => {
        finalRef.current = (finalRef.current + " " + text).trim();
        interimRef.current = finalRef.current;
        setCaption(finalRef.current);
        armSilence();
      },
      onError: (code) => {
        /* "no-speech" and "aborted" are normal punctuation in a long session — the engine
           simply gave up on a quiet stretch, and onend will restart it. Only a permission or
           transport failure is worth stopping the world for. */
        if (code === "not-allowed" || code === "service-not-allowed") {
          setErrorKey("voice.err.denied");
          setPhaseBoth("error");
        } else if (code === "network") {
          setErrorKey("voice.err.network");
          setPhaseBoth("error");
        }
      },
      onEnd: () => {
        /* Chrome ends recognition on its own after a stretch of silence. If we are still
           supposed to be listening, that is not the end of the turn — it is a dropped
           connection, and the loop only survives because we restart it. */
        if (closingRef.current || mutedRef.current) return;
        if (phaseRef.current !== "listening") return;

        const now = Date.now();
        if (now - restartRef.current < 400) return; // a failing engine must not spin the CPU
        restartRef.current = now;
        try {
          rec.start();
        } catch {
          /* already started — harmless */
        }
      },
    });

    if (!rec) {
      setErrorKey("voice.err.unsupported");
      setPhaseBoth("error");
      return;
    }

    recRef.current = rec;
    setPhaseBoth("listening");
    try {
      rec.start();
    } catch {
      /* start() throws if a previous instance has not fully released the mic; onEnd retries */
    }
  }, [activeLang, setPhaseBoth]);

  /* ── the turn ──────────────────────────────────────────────────────────── */

  const endTurn = useCallback(
    async (text) => {
      if (closingRef.current || phaseRef.current === "thinking") return;

      clearSilence();
      try {
        recRef.current?.stop();
      } catch {}
      recRef.current = null;

      finalRef.current = "";
      interimRef.current = "";
      setCaption(text);
      setPhaseBoth("thinking");

      let reply = null;
      try {
        reply = await onSend(text);
      } catch {
        /* a failed send is handled below, exactly like an empty one */
      }

      if (closingRef.current) return;

      if (!reply) {
        /* Stopped, rate-limited, or refused. The chat pane has already said why — do not
           invent a spoken explanation for something we cannot see. */
        setPhaseBoth("listening");
        startListening();
        return;
      }

      const { text: speech, truncated } = toSpeech(replyToText(reply));
      const full = truncated ? `${speech} ${t("voice.truncated")}` : speech;

      setPhaseBoth("speaking");
      setSpoken(full);

      const speaker = speakerRef.current;
      const { completed } = await speaker.speak(full, { lang: activeLang });

      /* Cancelled means the user tapped to interrupt, and that path has already moved us into
         listening — stepping on it here would restart the recognizer twice. */
      if (completed && !closingRef.current) startListening();
    },
    [onSend, startListening, setPhaseBoth, t, activeLang]
  );

  /* The recognizer callbacks reach endTurn through this, never directly — see endTurnRef. The
     effect runs long before any of them can fire, since the first one needs the user to speak. */
  useEffect(() => {
    endTurnRef.current = endTurn;
  }, [endTurn]);

  /* ── interrupt ─────────────────────────────────────────────────────────── */

  const interrupt = useCallback(() => {
    if (phaseRef.current !== "speaking") return;
    speakerRef.current?.cancel();
    setSpoken("");
    startListening();
  }, [startListening]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      meterRef.current?.setMuted(next);

      if (next) {
        clearSilence();
        try {
          recRef.current?.stop();
        } catch {}
        recRef.current = null;
        setCaption("");
        setPhaseBoth("idle");
      } else if (phaseRef.current !== "speaking" && phaseRef.current !== "thinking") {
        startListening();
      }
      return next;
    });
  }, [setPhaseBoth, startListening]);

  /* ── lifecycle ─────────────────────────────────────────────────────────── */

  const teardown = useCallback(() => {
    closingRef.current = true;
    clearSilence();
    speakerRef.current?.cancel();
    try {
      recRef.current?.abort?.() ?? recRef.current?.stop?.();
    } catch {}
    recRef.current = null;
    meterRef.current?.stop();
    meterRef.current = null;
  }, []);

  const close = useCallback(() => {
    teardown();
    onClose();
  }, [teardown, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const support = speechSupport();
    closingRef.current = false;
    mutedRef.current = false;
    setMuted(false);
    setErrorKey("");
    setCaption("");
    setSpoken("");
    speakerRef.current = createSpeaker();

    if (!support.stt) {
      setErrorKey("voice.err.unsupported");
      setPhaseBoth("error");
      return () => teardown();
    }

    let cancelled = false;
    (async () => {
      /* The meter is a nice-to-have: without it the orb cannot react to the user's voice, but
         the conversation still works. Never block the session on it. */
      const meter = await createLevelMeter();
      if (cancelled || closingRef.current) {
        meter?.stop();
        return;
      }
      meterRef.current = meter;
      startListening();
    })();

    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Esc closes, and the page behind must not scroll under the overlay. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
      if (e.key === " " && phaseRef.current === "speaking") {
        e.preventDefault();
        interrupt();
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, interrupt]);

  /* ── the orb ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!open) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const style = getComputedStyle(document.documentElement);
    const accent = hexToRgb(style.getPropertyValue("--accent"));
    const rgba = (rgb, a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;

    let raf = 0;
    let smooth = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);

      const t = (now - start) / 1000;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const current = phaseRef.current;

      /* Where the orb's energy comes from, per phase. Speech synthesis exposes no audio stream,
         so a speaking orb is driven by a synthetic envelope — two detuned sines, which reads as
         "someone is talking" far better than a constant pulse does. */
      let target;
      if (current === "listening") target = mutedRef.current ? 0.04 : levelRef.current;
      else if (current === "speaking") target = 0.34 + 0.2 * Math.sin(t * 8.4) + 0.12 * Math.sin(t * 13.1);
      else if (current === "thinking") target = 0.16 + 0.1 * Math.sin(t * 2.6);
      else target = 0.05;

      if (current === "listening" && meterRef.current) levelRef.current = meterRef.current.level();
      smooth += (Math.max(0, target) - smooth) * 0.18; // never snap; the eye reads a jump as a glitch

      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.235;
      const amp = base * (0.05 + smooth * 0.42);

      ctx.clearRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(cx, cy, base * 0.3, cx, cy, base * (1.75 + smooth * 0.7));
      glow.addColorStop(0, rgba(accent, 0.3 + smooth * 0.28));
      glow.addColorStop(0.55, rgba(accent, 0.07 + smooth * 0.08));
      glow.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Three offset blobs: the interference between them is what stops it looking like a circle.
      for (let layer = 0; layer < 3; layer++) {
        const offset = layer * 2.4;
        const speed = 0.75 + layer * 0.32;
        const radius = base * (1 - layer * 0.07);

        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.001; a += Math.PI / 90) {
          const wobble =
            Math.sin(a * 3 + t * speed + offset) * amp * 0.5 +
            Math.sin(a * 5 - t * speed * 1.35 + offset) * amp * 0.3 +
            Math.sin(a * 2 + t * speed * 0.6 + offset) * amp * 0.26;
          const r = radius + wobble;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const fill = ctx.createLinearGradient(cx - base, cy - base, cx + base, cy + base);
        fill.addColorStop(0, rgba(accent, 0.95 - layer * 0.3));
        fill.addColorStop(1, rgba(accent, 0.45 - layer * 0.14));
        ctx.fillStyle = fill;
        ctx.globalCompositeOperation = layer === 0 ? "source-over" : "screen";
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // Thinking: a ring that actually goes round, so a slow tool call still looks like progress.
      if (current === "thinking") {
        ctx.beginPath();
        ctx.arc(cx, cy, base * 1.32, t * 2.4, t * 2.4 + Math.PI * 0.6);
        ctx.strokeStyle = rgba(accent, 0.85);
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // Muted: a slash across a dimmed orb needs no label to be understood.
      if (mutedRef.current && current !== "speaking") {
        ctx.beginPath();
        ctx.moveTo(cx - base * 0.5, cy - base * 0.5);
        ctx.lineTo(cx + base * 0.5, cy + base * 0.5);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  if (!open) return null;

  const statusKey =
    muted
      ? "voice.status.muted"
      : phase === "listening"
        ? "voice.status.listening"
        : phase === "thinking"
        ? "voice.status.thinking"
        : phase === "speaking"
          ? "voice.status.speaking"
          : phase === "error"
            ? "voice.status.error"
            : "voice.status.paused";

  const transcript = phase === "speaking" ? spoken : caption;

  return (
    <div className="voice-overlay" role="dialog" aria-modal="true" aria-label={t("voice.title")}>
      <div className="voice-top">
        <div className="voice-badge">
          <span className={"voice-dot " + phase} />
          {t("voice.title")}
        </div>
        <button className="voice-close" onClick={close} title={t("voice.close")} aria-label={t("voice.close")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="voice-stage">
        <button
          className={"voice-orb " + phase}
          onClick={interrupt}
          disabled={phase !== "speaking"}
          title={phase === "speaking" ? t("voice.interrupt") : ""}
          aria-label={t("voice.orbAria")}
        >
          <canvas ref={canvasRef} />
        </button>

        <div className={"voice-status " + phase} aria-live="polite">
          {errorKey ? t(errorKey) : t(statusKey)}
        </div>

        <div className={"voice-caption" + (transcript ? " has-text" : "")}>
          {transcript || (phase === "listening" && !muted ? t("voice.hint") : "")}
        </div>
      </div>

      <div className="voice-controls">
        <button
          className={"voice-ctl" + (muted ? " active" : "")}
          onClick={toggleMute}
          disabled={phase === "error"}
          title={muted ? t("voice.unmute") : t("voice.mute")}
          aria-label={muted ? t("voice.unmute") : t("voice.mute")}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
              <path d="M5 10v2a7 7 0 0 0 12 5" />
              <path d="M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          )}
        </button>

        <button className="voice-ctl end" onClick={close} title={t("voice.end")} aria-label={t("voice.end")}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.98.98 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>

      {phase === "speaking" && <div className="voice-tip">{t("voice.tapToInterrupt")}</div>}
    </div>
  );
}
