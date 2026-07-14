"use client";

/* Voice I/O, entirely in the browser — which is NOT the same as on the device. Read that twice.
 *
 * An earlier version of this comment claimed voice mode "ships no audio to any third party we
 * would then have to disclose." That was false, and it was false in shipped code, in the one
 * product that cannot afford a quiet overclaim. Corrected here, in full, because a comment that
 * lies to the next reader is worse than no comment:
 *
 * SpeechRecognition IS A CLOUD API. In Chrome it streams the user's microphone to Google
 * (Chromium hardcodes https://www.google.com/speech-api/full-duplex/v1); Safari sends it to
 * Apple; Edge sends it to Azure. The W3C spec is deliberately agnostic and `processLocally`
 * defaults to false, so a page that does not ask for on-device recognition — and this one does
 * not — gets whatever the browser prefers, which is remote. The code below has known this all
 * along: createRecognizer's caller handles the error code "network" (VoiceMode.jsx:120), and a
 * recogniser running on the device cannot produce a network error.
 *
 * So: WE SEND THE USER'S VOICE TO A THIRD PARTY. That has to be said in the privacy policy, and
 * it must not be un-said here again.
 *
 * The costs are likewise a narrower claim than the old comment made. The VOICE LAYER adds no cost
 * of its own — a spoken turn bills exactly what the same question typed would bill, through the
 * same signed session and the same spend caps (VoiceMode → voiceSend → send() → POST /api/chat →
 * acquire(), lib/rateLimit.js). But voice mode itself is not free: it fires a turn on every pause,
 * with no button press, so it burns the daily cap FASTER than typing does, not slower.
 *
 * The remaining trade is quality: these are the OS voices, not a neural TTS. If that becomes the
 * thing holding the feature back, swap createSpeaker() for a server route and leave every caller
 * untouched — that is why the speaker is an object and not a bare function. Note what that would
 * cost honestly: a per-character bill that lib/rateLimit.js cannot meter as written (it prices
 * tokens, and no speech vendor sells tokens), plus the assistant's reply text going out to a
 * second third party. Both would have to be disclosed too.
 *
 * Support is real but uneven: Chrome, Edge and Safari have both halves; Firefox has synthesis
 * but no recognition. speechSupport() is what the UI checks before it offers the button, so a
 * Firefox user is told why rather than handed a mic that silently does nothing. */

/* The UI's language codes are not what the speech engines want, and the engines will not infer
   it: a recognizer left on en-US transcribes Japanese as English-sounding nonsense. */
const LANG_TAGS = {
  en: "en-US",
  zh: "zh-CN",
  es: "es-ES",
  ja: "ja-JP",
  ko: "ko-KR",
};

export function speechLangTag(lang) {
  return LANG_TAGS[lang] || LANG_TAGS.en;
}

export function speechSupport() {
  if (typeof window === "undefined") return { stt: false, tts: false };
  return {
    stt: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    tts: Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance),
  };
}

/* ────────────────────────── making a reply speakable ────────────────────────── */

/* The agent answers in Markdown, with tables, box-drawing headers and 42-character hex
   addresses. Read aloud verbatim that is: "asterisk asterisk verdict asterisk asterisk, zero
   x seven a three f..." — unusable. Everything below turns a written answer into a spoken one. */
const ADDRESS = /\b0x[a-fA-F0-9]{6,}\b/g;
const URL = /https?:\/\/\S+|www\.\S+/g;
const CODE_FENCE = /```[\s\S]*?```/g;
const BOX_DRAWING = /[─-╿▀-▟]/g;
const EMOJI = /[\u{1f000}-\u{1ffff}\u{2600}-\u{27bf}\u{fe00}-\u{fe0f}\u{2190}-\u{21ff}]/gu;

export function toSpeech(raw, { maxChars = 1200 } = {}) {
  let text = String(raw || "");

  text = text
    .replace(CODE_FENCE, " (code block) ")
    .replace(URL, " (link) ")
    /* An address is unspeakable in full but its tail is what a human actually quotes back, so
       keep that and drop the other 38 characters. */
    .replace(ADDRESS, (a) => ` the address ending ${a.slice(-4).split("").join(" ")} `)
    .replace(BOX_DRAWING, " ")
    .replace(EMOJI, " ")
    .replace(/^#{1,6}\s*/gm, "") // heading marks
    .replace(/^\s*[-*+]\s+/gm, "") // bullets — the pause does the listing
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+?)`/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, "") // table rows read as pipe soup
    .replace(/[_~]{2,}/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .trim();

  if (text.length <= maxChars) return { text, truncated: false };

  /* Cut on a sentence, never mid-word: a voice answer that stops in the middle of a number is
     worse than one that stops early and says so. */
  const window = text.slice(0, maxChars);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  const cut = lastStop > maxChars * 0.5 ? lastStop + 1 : window.lastIndexOf(" ");

  return { text: text.slice(0, cut > 0 ? cut : maxChars).trim(), truncated: true };
}

/* Chrome stalls on a long utterance and will not start speaking until the whole thing is
   synthesised, so a 900-character answer begins with a two-second silence. Sentence-sized
   chunks start instantly — and give barge-in a seam to cut in on. */
export function chunkForSpeech(text, { max = 180 } = {}) {
  const sentences = String(text || "")
    .split(/(?<=[.!?。！？])\s+/)
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > max) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      // A single sentence longer than the cap: break it on commas, then on words.
      let rest = sentence;
      while (rest.length > max) {
        const window = rest.slice(0, max);
        const at = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(" "));

        /* No usable break before the cap — a hex blob, a URL, a compound in a language that
           does not space its words. Overshoot to the next space rather than slicing a word in
           half: an over-long utterance is merely inelegant, whereas "Thre" / "e." is a speech
           engine reading gibberish out loud. */
        const cut =
          at > max * 0.4
            ? at + 1
            : (() => {
                const next = rest.indexOf(" ", max);
                return next === -1 ? rest.length : next + 1;
              })();

        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut);
      }
      if (rest.trim()) current = rest.trim();
      continue;
    }

    if ((current + " " + sentence).trim().length > max) {
      chunks.push(current);
      current = sentence;
    } else {
      current = (current ? current + " " : "") + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => /\S/.test(c));
}

/* ────────────────────────── speaking ────────────────────────── */

/* Voices arrive asynchronously in Chrome: the first getVoices() after a cold load returns []
   and the list only populates on the voiceschanged event. Asking once and caching the empty
   answer is why so many sites speak in the wrong accent forever. */
function loadVoices() {
  const synth = window.speechSynthesis;
  const ready = synth.getVoices();
  if (ready.length) return Promise.resolve(ready);

  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1000); // Safari never fires the event — do not hang on it
  });
}

/* SCORE every candidate, then take the best. The previous version took the FIRST name that matched
   a regex, which is not the same thing and is why this app could sound like a 1980s robot.
 *
 * Three bugs lived in that one line, and the third one is the robot:
 *   1. `pool.find(GOOD_VOICE)` returns the first match in whatever arbitrary order the OS enumerates,
 *      so "Samantha" (Apple's legacy compact) and "Google US English" (a genuinely good remote neural
 *      voice) scored identically — the winner was decided by enumeration order.
 *   2. The regex whitelisted `samantha` outright, and two of its alternatives — `siri`, `nova` — match
 *      no voice on any platform. Apple has never exposed the Siri voices to the web. Dead code.
 *   3. THE KILLER: on Apple devices EVERY voice has localService === true, so the middle clause could
 *      never fire. When the regex matched nothing — which it does in four of our five languages on a
 *      Mac — selection fell through to `pool[0]`: whatever the OS happened to list first. macOS
 *      preloads the Eloquence voices (Eddy, Flo, Grandma, Jacques, Reed, Rocko, Sandy, Shelley), a
 *      1980s formant synthesiser, in all five of our languages. `pool[0]` can be one of those. The
 *      code was capable of choosing a literal robot, and then we blamed "the OS voices".
 *
 * There IS a machine-readable quality signal, and the old comment was wrong to say there wasn't.
 * Apple encodes the package tier in voiceURI — com.apple.voice.compact.en-US.Samantha versus
 * com.apple.voice.enhanced.en-US.Samantha. The same NAME is a different voice depending only on what
 * the user has downloaded, so the name alone genuinely cannot tell you; the URI can.
 *
 * PRIVACY, stated because this file's own header makes a claim about it: a voice with
 * localService === false is synthesised on the vendor's servers, which means the assistant's reply
 * text is sent to Google or Microsoft. The old code actively PREFERRED those (its middle clause) and
 * said nothing about it. It is still the right default — they are the best free voices there are —
 * but `localOnly` exists so a caller can refuse, and the header comment now has to say so. */

const baseName = (voice) => String(voice.name).split("(")[0].trim().toLowerCase();

/* Apple's Effects pack and MacinTalk legacy voices. Preloaded, and never what anyone wants. */
const NOVELTY = new Set([
  "albert", "bad news", "bahh", "bells", "boing", "bubbles", "cellos", "good news", "jester",
  "organ", "superstar", "trinoids", "whisper", "wobble", "zarvox", "fred", "junior", "kathy", "ralph",
]);

/* Eloquence. The 1980s formant synth described above — the actual robot, in all five languages. */
const ELOQUENCE = new Set([
  "eddy", "flo", "grandma", "grandpa", "jacques", "reed", "rocko", "sandy", "shelley",
]);

const isDenied = (voice) =>
  NOVELTY.has(baseName(voice)) || ELOQUENCE.has(baseName(voice)) || /^espeak/i.test(voice.name);

/* Ordered best to worst. First pattern that matches sets the score. */
const VOICE_TIERS = [
  [/\bOnline \(Natural\)/i, 100], // Microsoft Azure neural, exposed free through Edge. The best free voice available.
  [/\(Natural\)/i, 90], //           Google neural — Android, ChromeOS.
  [/^Google\s/i, 80], //             Chrome desktop's remote voices. Every locale is named "Google …".
  [/^(Alex|Hattori|Aman|Tara)\b/i, 45], //                                    Apple's best local voices.
  [/^(Ava|Zoe|Serena|Karen|Lee|Isha|Yuna|Jian|Lilian|Han|Meijia|Matilda)\b/i, 35],
  [/^(Samantha|Daniel|Moira|Tessa|Kyoko|O-Ren|Tingting|Mónica|Paulina)\b/i, 10], // the compacts
  [/^Microsoft\s/i, 5], //           Windows SAPI5 (David, Zira, Huihui). Intelligible; unmistakably a machine.
];

function scoreVoice(voice, tag, localOnly) {
  if (isDenied(voice)) return -Infinity;
  if (localOnly && voice.localService === false) return -Infinity;

  let score = 0;
  for (const [pattern, points] of VOICE_TIERS) {
    if (pattern.test(voice.name)) {
      score = points;
      break;
    }
  }

  /* The signal the old code said did not exist. An "enhanced"/"premium" Samantha is a completely
     different recording from the compact one that ships by default, and only the URI knows. */
  const uri = String(voice.voiceURI || "");
  if (/premium/i.test(uri)) score += 40;
  else if (/enhanced/i.test(uri)) score += 30;
  else if (/compact/i.test(uri)) score -= 10;

  /* en-US beats en-GB when the user asked for en-US. A right-language wrong-region voice is fine;
     it should just never outrank the exact one. */
  if (voice.lang?.toLowerCase() === tag.toLowerCase()) score += 15;
  if (voice.default) score += 1; // pure tie-break

  return score;
}

async function pickVoice(lang, { localOnly = false } = {}) {
  const tag = speechLangTag(lang);
  const prefix = tag.slice(0, 2);
  const voices = await loadVoices();
  if (!voices.length) return null;

  const forLang = voices.filter((v) => v.lang?.toLowerCase().startsWith(prefix));
  const pool = forLang.length ? forLang : voices;

  let best = null;
  let bestScore = -Infinity;
  for (const voice of pool) {
    const score = scoreVoice(voice, tag, localOnly);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }

  /* Everything in the pool was a novelty or a formant synth. Returning null leaves utterance.voice
     unset and lets the browser pick its own default — which is a mediocre voice, but never Zarvox.
     Handing the user a deliberate robot is worse than declining to choose. */
  return bestScore === -Infinity ? null : best;
}

/**
 * A speaker owns the synthesis queue. speak() resolves when the whole text has been spoken OR
 * when cancel() cut it short — the caller distinguishes the two by the resolved value, because
 * "she finished talking" and "the user interrupted her" lead to very different next states.
 *
 * @returns {{ speak: (text: string, opts?: object) => Promise<{ completed: boolean }>, cancel: () => void, speaking: () => boolean }}
 */
export function createSpeaker() {
  let token = 0;
  let speaking = false;
  let keepAlive = null;

  const stopKeepAlive = () => {
    clearInterval(keepAlive);
    keepAlive = null;
  };

  function cancel() {
    token++; // invalidate any in-flight speak(), so its loop stops queueing chunks
    speaking = false;
    stopKeepAlive();
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }

  async function speak(text, { lang = "en", onChunk } = {}) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth || !text) return { completed: false };

    cancel(); // one voice at a time
    const mine = token;
    const voice = await pickVoice(lang);
    if (mine !== token) return { completed: false }; // cancelled while voices were loading

    const chunks = chunkForSpeech(text);
    speaking = true;

    /* Chrome suspends synthesis after ~15s of continuous speech and never resumes on its own —
       the utterance just stops, mid-sentence, with no error and no end event. Nudging it is
       the only known fix. */
    stopKeepAlive();
    keepAlive = setInterval(() => {
      if (synth.speaking && !synth.paused) synth.resume();
    }, 8000);

    for (const chunk of chunks) {
      if (mine !== token) break;
      onChunk?.(chunk);

      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = speechLangTag(lang);
        if (voice) utterance.voice = voice;
        utterance.rate = 1.05;
        utterance.pitch = 1;
        utterance.onend = resolve;
        utterance.onerror = resolve; // a failed chunk must not wedge the queue
        synth.speak(utterance);
      });
    }

    stopKeepAlive();
    const completed = mine === token;
    if (completed) speaking = false;
    return { completed };
  }

  return { speak, cancel, speaking: () => speaking };
}

/* ────────────────────────── listening ────────────────────────── */

/**
 * Thin wrapper over SpeechRecognition. Returns null when the browser has none, so the caller
 * can decide what to show rather than being handed an object that does nothing.
 */
export function createRecognizer({ lang = "en", onInterim, onFinal, onError, onEnd } = {}) {
  if (typeof window === "undefined") return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = speechLangTag(lang);
  rec.continuous = true;
  rec.interimResults = true; // what makes the live caption possible
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) final += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (final.trim()) onFinal?.(final.trim());
    if (interim.trim()) onInterim?.(interim.trim());
  };

  rec.onerror = (event) => onError?.(event.error);
  rec.onend = () => onEnd?.();

  return rec;
}

/* ────────────────────────── the orb's heartbeat ────────────────────────── */

/**
 * RMS microphone level, 0..1, sampled straight from an AnalyserNode.
 *
 * This is a SECOND capture of the same mic that SpeechRecognition is already using, which is
 * fine everywhere it matters (the OS mixes them) and is the only way to get a waveform at all —
 * SpeechRecognition exposes no audio. If it fails, voice mode still works; the orb just breathes
 * on its idle animation instead of reacting. Never let a meter failure take the feature down.
 */
export async function createLevelMeter() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    return null; // permission denied, or no input device
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.75;
  source.connect(analyser);

  const buffer = new Uint8Array(analyser.frequencyBinCount);

  return {
    level() {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      // RMS of speech sits around 0.05–0.2; scale it into something an animation can use.
      return Math.min(1, Math.sqrt(sum / buffer.length) * 4.5);
    },
    setMuted(muted) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    },
    stop() {
      stream.getTracks().forEach((track) => track.stop());
      ctx.close().catch(() => {});
    },
  };
}
