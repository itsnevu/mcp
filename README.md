# HoodScope — Agentic AI untuk Robinhood Chain (Next.js)

Chat UI untuk Robinhood Chain — dibangun dengan **Next.js (App Router) + React**,
plus API route yang bisa berjalan sebagai demo lokal atau live mode lewat
**Claude API + robinx-mcp**.

## ▶️ Cara menjalankan

```bash
npm install     # sekali saja
npm run dev     # buka http://localhost:3000
```

Build produksi: `npm run build && npm start`.

## ✨ Enhancement

| Fitur | Keterangan |
|---|---|
| 📈 Ticker tape | Strip harga berjalan di atas (demo feed, pause saat hover, loop seamless) |
| 💬 Multi-chat history | Tersimpan di `localStorage`, bisa dibuka lagi & dihapus |
| ⌨️ Slash commands | Ketik `/` → `/rugcheck`, `/trending`, `/sentiment`, `/wallet`, `/fud`, `/moving`, `/help` (navigasi ↑ ↓ Enter) |
| 🛡️ Widget kaya | Rug-check report + gauge risiko, tabel trending + sparkline, sentiment bar, stat tile wallet |
| 🎙️ Voice input | Web Speech API (Chrome/Safari); tap lagi untuk stop |
| ⏹️ Stop generation | Tombol berubah jadi stop saat loading/mengetik — juga membatalkan request (AbortController + timeout 20s) |
| 🔌 Status pill | Membedakan `Live data`, `Live ready`, `Demo mode`, dan `Backend offline` |
| ⚙️ Settings modal | Ganti URL backend eksternal, test koneksi, clear semua chat |
| 📋 Copy & timestamp | Hover/focus balasan agent → tombol copy; semua pesan ada jam |
| 🌗 Light/dark theme | Toggle tersimpan, tanpa flash saat reload |
| 📲 Installable PWA | Manifest, icon 192/512, service worker, dan offline fallback |
| ⌘K / Esc | Fokus input dari mana saja; Esc menutup menu & modal |
| 📱 Mobile | Sidebar auto-collapse + backdrop, layout & widget menyesuaikan |

Kode ini punya hardening untuk race condition pindah-chat saat balasan masih loading,
validasi bentuk respons backend, guard IME composition, state localStorage yang korup,
rate limit API, dan fallback demo eksplisit.

## 🔌 Menyambungkan ke Claude API + robinx-mcp (mode live)

1. Buat `.env.local`:

   ```bash
   echo 'AUTH_SECRET=replace-with-long-random-secret' >> .env.local
   echo 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=...' >> .env.local
   echo 'GOOGLE_CLIENT_ID=...' >> .env.local
   echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local
   # optional:
   echo 'ROBINX_WALLET_KEY=0x...' >> .env.local
   echo 'ROBINX_MAX_USD_PER_CALL=0.10' >> .env.local
   ```

2. Jalankan app. `/api/chat` otomatis memakai Claude + RobinX MCP saat
   `ANTHROPIC_API_KEY` ada. Kalau live backend gagal, respons tetap fallback ke demo.

3. Kontrak API yang dimengerti UI:

   ```
   POST /api/chat  { message, mode, history[] }
     → { reply, source: "live"|"demo", backend }
   GET  /api/health → { ok, service, mode, capabilities }
   ```

   Detail bentuk tiap `kind` ada di [lib/demoAgent.js](lib/demoAgent.js). Respons yang
   valid otomatis dirender jadi widget (gauge, sparkline, dll); respons yang bentuknya
   salah tidak akan merusak UI (ada validasi di [lib/text.js](lib/text.js)).

## 📁 Struktur

```
app/
  layout.js            ← root layout + restore theme sebelum paint
  page.js              ← halaman utama
  globals.css          ← seluruh styling (design tokens dark/light)
  api/chat/route.js    ← endpoint chat (demo) + panduan wiring Claude/MCP
  api/health/route.js  ← health check untuk status pill
components/
  HoodScopeApp.jsx     ← state utama + orkestrasi send/stop/history
  Sidebar.jsx          ← recents + suggested prompts
  InputBar.jsx         ← input, mode dropdown, slash commands, mic
  ChatView.jsx         ← pesan + efek typewriter
  Widgets.jsx          ← rugcheck/trending/sentiment/wallet widgets
  SettingsModal.jsx    ← pengaturan backend
  TickerTape.jsx       ← ticker harga demo
  SvgSprite.jsx        ← ikon SVG
lib/
  demoAgent.js         ← agent demo (dipakai API route & fallback client)
  text.js              ← render markdown mini, validasi reply, util teks
  commands.js          ← daftar slash command
legacy-static/         ← versi HTML+Node lama (arsip)
```

## ✅ Verifikasi

```bash
npm run verify
```

## ⚠️ Catatan penting

- **Live tools berbayar**: beberapa tool RobinX MCP memakai x402/USDC. Tanpa
  `ROBINX_WALLET_KEY`, tool berbayar dapat mengembalikan price probe, bukan data.
- **Data demo**: angka dengan badge `DEMO DATA` adalah placeholder dan bukan saran finansial.
