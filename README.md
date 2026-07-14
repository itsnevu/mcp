# Bugglo — Agentic AI for Robinhood Chain (Next.js)

A chat UI for Robinhood Chain — built with **Next.js (App Router) + React**, plus an
API route that answers only through the **RobinX engine + robinx-mcp**.

This repo is an npm workspace. Alongside the web app it publishes two packages that
carry the same chain-reading engine, so the app, the terminal, and an agent cannot
drift apart about what a contract is:

| Package | What it is |
|---|---|
| [`bugglo`](packages/bugglo/) | The CLI + library. `npx bugglo <address>` — no account, no API key, no backend. |
| [`bugglo-mcp`](packages/bugglo-mcp/) | The same engine as an MCP server, for Claude Desktop / Cursor / your own agent. |

```bash
npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
```

Both are MIT and documented at `/docs/bugglo-cli`. They depend on nothing in this app —
`bugglo` pulls in viem and nothing else, because `npx` cold-start is the entire
wow-moment budget.

## ▶️ Running it

```bash
npm install     # once
npm run dev     # open http://localhost:3000
```

Production build: `npm run build && npm start`.

## ✨ Features

| Feature | Notes |
|---|---|
| 📈 Ticker tape | Scrolling live price strip up top (pauses on hover, seamless loop) |
| 💬 Multi-chat history | Persisted to `localStorage`; reopenable and deletable |
| ⌨️ Slash commands | Type `/` → `/rugcheck`, `/trending`, `/sentiment`, `/wallet`, `/fud`, `/moving`, `/help` (navigate with ↑ ↓ Enter) |
| 🛡️ Rich widgets | Rug-check report + risk gauge, trending table + sparkline, sentiment bar, wallet stat tiles |
| 🎙️ Voice input | Web Speech API (Chrome/Safari); tap again to stop |
| ⏹️ Stop generation | The button becomes a stop control while loading/typing, and cancels the request too (AbortController + 20s timeout) |
| 🔌 Status pill | Distinguishes `Live data`, `Live ready`, tools-offline, and `Backend offline` |
| ⚙️ Settings | Theme, interface language, external backend URL + connection test, clear all chats |
| 🌐 Languages | English, 中文, Español, 日本語, 한국어 — the whole app shell, not just a few strings |
| 📋 Copy & timestamps | Hover/focus an agent reply for a copy button; every message is timestamped |
| 🌗 Light/dark theme | Persisted, with no flash on reload |
| 📲 Installable PWA | Manifest, 192/512 icons, service worker, offline fallback |
| ⌘K / ⇧⌘, / Esc | Focus the input from anywhere; open Settings; Esc closes menus and modals |
| 📱 Mobile | Sidebar auto-collapses behind a backdrop; layout and widgets adapt |

The code is hardened against chat-switching race conditions while a reply is still
streaming, malformed backend response shapes, IME composition, corrupt `localStorage`
state, API rate limits, and production outages that must not turn into invented market data.

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

## 🔌 Connecting the RobinX engine + robinx-mcp (live mode)

1. Create `.env.local`:

   ```bash
   echo 'AUTH_SECRET=replace-with-long-random-secret' >> .env.local
   echo 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=...' >> .env.local
   echo 'GOOGLE_CLIENT_ID=...' >> .env.local

   # the engine — all three are required, there is no default for any of them
   echo 'ROBINX_ENGINE_KEY=...' >> .env.local
   echo 'ROBINX_ENGINE_URL=...' >> .env.local     # OpenAI-compatible chat-completions base URL
   echo 'ROBINX_ENGINE_MODEL=...' >> .env.local   # model id as your provider spells it

   # optional:
   echo 'ROBINX_WALLET_KEY=0x...' >> .env.local
   echo 'ROBINX_MAX_USD_PER_CALL=0.10' >> .env.local
   ```

2. Run the app. `/api/chat` uses the engine + RobinX MCP once all three `ROBINX_ENGINE_*`
   vars are set. Drop any one of them and the route returns `503` rather than invented
   market data.

3. **The engine costs money per token, so `/api/chat` is metered.** Requests are capped per
   minute, per hour and per day, and the day's spend is capped in dollars — per user and
   globally. Over any cap the route returns `429 { busy: true }` rather than an answer,
   because quietly serving made-up numbers to someone asking a real question about their money
   is worse than serving nothing. The caps and their defaults are documented at the top of
   [lib/rateLimit.js](lib/rateLimit.js); all of them are env-tunable.

4. The API contract the UI understands:

   ```
   POST /api/chat  { message, mode, history[], attachments[], incognito }
     → { reply, source: "live", backend, degraded? }
     → 429 { error, busy: true, retryAfterMs }   when over a cap
     → 503 { error, unavailable: true }           when live production cannot answer
   GET  /api/health?probe=1 → { ok, service, mode, capabilities, observedAt, uptimeSeconds }
   GET  /api/usage          → { ok, user, usage }   authenticated quota snapshot
   ```

   Valid response kinds are rendered as widgets (gauge, sparkline, and so on); a
   malformed response cannot break the UI (see the validation in [lib/text.js](lib/text.js)).

## 📁 Structure

```
app/
  layout.js            ← root layout + theme restore before first paint
  page.js              ← main page
  globals.css          ← all styling (dark/light design tokens)
  api/chat/route.js    ← chat endpoint + engine/MCP wiring + spend guard
  api/health/route.js  ← health check behind the status pill
components/
  HoodScopeApp.jsx     ← top-level state + send/stop/history orchestration
  AuthGate.jsx         ← Google + wallet login, guest mode
  Sidebar.jsx          ← recents, suggested prompts, user menu
  InputBar.jsx         ← input, mode dropdown, slash commands, mic
  ChatView.jsx         ← messages + typewriter effect
  Widgets.jsx          ← rugcheck/trending/sentiment/wallet widgets
  SettingsModal.jsx    ← settings (general, appearance, language, backend, data)
  TickerTape.jsx       ← live price ticker
  SvgSprite.jsx        ← SVG icons
lib/
  i18n.js              ← locale registry, {token} interpolation, legacy migration
  I18nContext.jsx      ← I18nProvider, useI18n() → t / tRich
  locales/             ← en, zh, es, ja, ko
  text.js              ← mini markdown renderer, reply validation, text utils
  commands.js          ← slash command list
  chainData.js         ← app-side wrapper over the `bugglo` package
packages/              ← published to npm; no dependency on the app
  bugglo/              ← chain.js (the engine) + cli.js + report.js
  bugglo-mcp/          ← MCP adapter over `bugglo`. Seven tools, chain 4663 only.
```

## ✅ Verify

```bash
npm run verify   # lint + tests + production build
```

## ⚠️ Important notes

- **Live tools cost money**: some RobinX MCP tools use x402/USDC. Without
  `ROBINX_WALLET_KEY`, paid tools may return a price probe instead of data.
