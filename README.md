# 🏇 Ranger — Agentic AI untuk Robinhood Chain (Next.js)

Chat UI ala Ranger AI untuk Robinhood Chain — dibangun dengan **Next.js (App Router) + React**,
bukan sekadar clone: tampilan sama dengan referensi, plus banyak enhancement, dan API route
yang siap disambungkan ke **Claude API + robinx-mcp**.

## ▶️ Cara menjalankan

```bash
npm install     # sekali saja
npm run dev     # buka http://localhost:3000
```

Build produksi: `npm run build && npm start`.

## ✨ Enhancement di atas desain aslinya

| Fitur | Keterangan |
|---|---|
| 📈 Ticker tape | Strip harga berjalan di atas (demo feed, pause saat hover, loop seamless) |
| 💬 Multi-chat history | Tersimpan di `localStorage`, bisa dibuka lagi & dihapus |
| ⌨️ Slash commands | Ketik `/` → `/rugcheck`, `/trending`, `/sentiment`, `/wallet`, `/fud`, `/moving`, `/help` (navigasi ↑ ↓ Enter) |
| 🛡️ Widget kaya | Rug-check report + gauge risiko, tabel trending + sparkline, sentiment bar, stat tile wallet |
| 🎙️ Voice input | Web Speech API (Chrome/Safari); tap lagi untuk stop |
| ⏹️ Stop generation | Tombol berubah jadi stop saat loading/mengetik — juga membatalkan request (AbortController + timeout 20s) |
| 🔌 Status pill | "Live" kalau `/api/health` merespons, "Demo mode" kalau tidak |
| ⚙️ Settings modal | Ganti URL backend eksternal, test koneksi, clear semua chat |
| 📋 Copy & timestamp | Hover/focus balasan agent → tombol copy; semua pesan ada jam |
| 🌗 Light/dark theme | Toggle tersimpan, tanpa flash saat reload |
| ⌘K / Esc | Fokus input dari mana saja; Esc menutup menu & modal |
| 📱 Mobile | Sidebar auto-collapse + backdrop, layout & widget menyesuaikan |

Kode ini juga sudah melewati **review multi-agent** (24 temuan bug diverifikasi lalu
diperbaiki): race condition pindah-chat saat balasan masih loading, validasi bentuk
respons backend, guard IME composition, state localStorage yang korup, dan lainnya.

## 🔌 Menyambungkan ke Claude API + robinx-mcp (mode live)

1. Install dependency tambahan:

   ```bash
   npm install @anthropic-ai/sdk @modelcontextprotocol/sdk robinx-mcp
   echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local
   ```

2. Buka [app/api/chat/route.js](app/api/chat/route.js) → ganti pemanggilan `demoAgent()`
   dengan loop agentic Claude. Contoh lengkapnya sudah ada di komentar atas file itu:
   - connect ke `robinx-mcp` lewat stdio (MCP client),
   - daftarkan tools MCP ke Claude (`toolRunner`),
   - Claude memanggil tools itu untuk data on-chain asli.

3. Kontrak API yang dimengerti UI:

   ```
   POST /api/chat  { message, mode, history[] }
     → { reply: string | { kind: "text"|"rugcheck"|"trending"|"sentiment"|"wallet", ... } }
   GET  /api/health → { ok: true }
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
  RangerApp.jsx        ← state utama + orkestrasi send/stop/history
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

## ⚠️ Catatan penting

- **Branding**: Nama/logo "Ranger" & handle `@RangerAI_tech` milik pihak lain —
  ini untuk belajar/prototipe lokal. **Ganti nama, logo, dan handle sebelum
  di-deploy publik** (cari "Ranger" di `components/` dan `app/layout.js`).
- **Data**: Semua angka masih placeholder (badge `DEMO DATA`). Bukan data pasar
  asli dan bukan saran finansial.
