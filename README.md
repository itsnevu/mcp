# Bugglo — Agentic AI for Robinhood Chain (Next.js)

A chat UI for Robinhood Chain — built with **Next.js (App Router) + React**, plus an
API route that runs either as a local demo or in live mode via **Claude API + robinx-mcp**.

## ▶️ Running it

```bash
npm install     # once
npm run dev     # open http://localhost:3000
```

Production build: `npm run build && npm start`.

## ✨ Features

| Feature | Notes |
|---|---|
| 📈 Ticker tape | Scrolling price strip up top (demo feed, pauses on hover, seamless loop) |
| 💬 Multi-chat history | Persisted to `localStorage`; reopenable and deletable |
| ⌨️ Slash commands | Type `/` → `/rugcheck`, `/trending`, `/sentiment`, `/wallet`, `/fud`, `/moving`, `/help` (navigate with ↑ ↓ Enter) |
| 🛡️ Rich widgets | Rug-check report + risk gauge, trending table + sparkline, sentiment bar, wallet stat tiles |
| 🎙️ Voice input | Web Speech API (Chrome/Safari); tap again to stop |
| ⏹️ Stop generation | The button becomes a stop control while loading/typing, and cancels the request too (AbortController + 20s timeout) |
| 🔌 Status pill | Distinguishes `Live data`, `Live ready`, `Demo mode`, and `Backend offline` |
| ⚙️ Settings | Theme, interface language, external backend URL + connection test, clear all chats |
| 🌐 Languages | English, 中文, Español, 日本語, 한국어 — the whole app shell, not just a few strings |
| 📋 Copy & timestamps | Hover/focus an agent reply for a copy button; every message is timestamped |
| 🌗 Light/dark theme | Persisted, with no flash on reload |
| 📲 Installable PWA | Manifest, 192/512 icons, service worker, offline fallback |
| ⌘K / ⇧⌘, / Esc | Focus the input from anywhere; open Settings; Esc closes menus and modals |
| 📱 Mobile | Sidebar auto-collapses behind a backdrop; layout and widgets adapt |

The code is hardened against chat-switching race conditions while a reply is still
streaming, malformed backend response shapes, IME composition, corrupt `localStorage`
state, API rate limits, and it always has an explicit demo fallback.

## 🌐 Adding or changing a language

Locales live in [lib/locales/](lib/locales/), one file per language, each keyed by
BCP-47 code. `en.js` is the source of truth.

1. Add your keys to `lib/locales/en.js`.
2. Mirror them in every other locale file.
3. Register the language in `LANGUAGES` in [lib/i18n.js](lib/i18n.js).

`npm test` fails the build if a locale is missing a key, adds one, or drops a
`{token}` placeholder — so a half-translated locale cannot ship. In components,
call `t("some.key")` for plain text and `tRich("some.key", { link: <Link .../> })`
when a token has to resolve to a React element (this is what lets each language put
the link where its own grammar wants it).

Agent prompts (the `q`/`template` fields) deliberately stay in English regardless of
the UI language — only what the user reads is translated.

## 🔌 Connecting Claude API + robinx-mcp (live mode)

1. Create `.env.local`:

   ```bash
   echo 'AUTH_SECRET=replace-with-long-random-secret' >> .env.local
   echo 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=...' >> .env.local
   echo 'GOOGLE_CLIENT_ID=...' >> .env.local
   echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local
   # optional:
   echo 'ROBINX_WALLET_KEY=0x...' >> .env.local
   echo 'ROBINX_MAX_USD_PER_CALL=0.10' >> .env.local
   ```

2. Run the app. `/api/chat` automatically uses Claude + RobinX MCP when
   `ANTHROPIC_API_KEY` is set. If the live backend fails, the response still falls
   back to demo.

3. The API contract the UI understands:

   ```
   POST /api/chat  { message, mode, history[] }
     → { reply, source: "live"|"demo", backend }
   GET  /api/health → { ok, service, mode, capabilities }
   ```

   The shape of each `kind` is documented in [lib/demoAgent.js](lib/demoAgent.js).
   Valid responses are rendered as widgets (gauge, sparkline, and so on); a
   malformed response cannot break the UI (see the validation in [lib/text.js](lib/text.js)).

## 📁 Structure

```
app/
  layout.js            ← root layout + theme restore before first paint
  page.js              ← main page
  globals.css          ← all styling (dark/light design tokens)
  api/chat/route.js    ← chat endpoint (demo) + Claude/MCP wiring
  api/health/route.js  ← health check behind the status pill
components/
  HoodScopeApp.jsx     ← top-level state + send/stop/history orchestration
  AuthGate.jsx         ← Google + wallet login, guest mode
  Sidebar.jsx          ← recents, suggested prompts, user menu
  InputBar.jsx         ← input, mode dropdown, slash commands, mic
  ChatView.jsx         ← messages + typewriter effect
  Widgets.jsx          ← rugcheck/trending/sentiment/wallet widgets
  SettingsModal.jsx    ← settings (general, appearance, language, backend, data)
  TickerTape.jsx       ← demo price ticker
  SvgSprite.jsx        ← SVG icons
lib/
  i18n.js              ← locale registry, {token} interpolation, legacy migration
  I18nContext.jsx      ← I18nProvider, useI18n() → t / tRich
  locales/             ← en, zh, es, ja, ko
  demoAgent.js         ← demo agent (used by the API route and as a client fallback)
  text.js              ← mini markdown renderer, reply validation, text utils
  commands.js          ← slash command list
legacy-static/         ← old HTML+Node version (archived)
```

## ✅ Verify

```bash
npm run verify   # lint + tests + production build
```

## ⚠️ Important notes

- **Live tools cost money**: some RobinX MCP tools use x402/USDC. Without
  `ROBINX_WALLET_KEY`, paid tools may return a price probe instead of data.
- **Demo data**: figures carrying a `DEMO DATA` badge are placeholders, not financial advice.
