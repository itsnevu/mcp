import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";

export const metadata = {
  title: `Docs — ${APP_NAME}`,
  description: "Complete setup, API, live backend, and integration guide for HoodScope.",
};

const endpoints = [
  {
    method: "GET",
    path: "/api/auth/session",
    title: "Read current auth session",
    body: "No request body. Uses the HTTP-only session cookie.",
    response: `{
  "authenticated": true,
  "user": {
    "provider": "google",
    "email": "user@example.com"
  }
}`,
  },
  {
    method: "POST",
    path: "/api/auth/google",
    title: "Login with Google ID token",
    body: `{
  "credential": "GOOGLE_ID_TOKEN_FROM_GIS"
}`,
    response: `{
  "ok": true,
  "user": {
    "provider": "google",
    "email": "user@example.com"
  }
}`,
  },
  {
    method: "POST",
    path: "/api/auth/wallet/nonce",
    title: "Create wallet login challenge",
    body: `{
  "address": "0x..."
}`,
    response: `{
  "message": "HoodScope wants you to sign in...",
  "expiresIn": 300
}`,
  },
  {
    method: "POST",
    path: "/api/auth/wallet/verify",
    title: "Verify wallet signature",
    body: `{
  "address": "0x...",
  "message": "HoodScope wants you to sign in...",
  "signature": "0x..."
}`,
    response: `{
  "ok": true,
  "user": {
    "provider": "wallet",
    "address": "0x..."
  }
}`,
  },
  {
    method: "GET",
    path: "/api/health",
    title: "Backend health and mode",
    body: "No request body.",
    response: `{
  "ok": true,
  "service": "hoodscope-backend",
  "mode": "demo",
  "capabilities": {
    "anthropic": false,
    "mcp": false,
    "paidToolsEnabled": false
  }
}`,
  },
  {
    method: "POST",
    path: "/api/chat",
    title: "Chat with demo or live backend",
    body: `{
  "message": "Rug check this contract: 0x...",
  "mode": "Auto",
  "history": [
    { "role": "user", "text": "What can you do?" },
    { "role": "assistant", "text": "I can analyze Robinhood Chain data." }
  ]
}`,
    response: `{
  "reply": {
    "kind": "text",
    "text": "Answer text..."
  },
  "source": "demo",
  "backend": "demo"
}`,
  },
];

const replyKinds = [
  ["text", "Plain assistant response. Shape: { kind, text }."],
  ["rugcheck", "Contract risk widget with risk score, verdict, checks, and summary."],
  ["trending", "Trending token table with mentions, sentiment, change, and sparkline data."],
  ["sentiment", "Bullish, bearish, neutral split for a ticker or query."],
  ["wallet", "Wallet stats, labels, and risk flags."],
];

function CodeBlock({ children }) {
  return (
    <pre className="docs-code">
      <code>{children}</code>
    </pre>
  );
}

function Pill({ children }) {
  return <span className="docs-pill">{children}</span>;
}

export default function DocsPage() {
  return (
    <main className="docs-page">
      <nav className="docs-topbar" aria-label="Documentation navigation">
        <Link href="/" className="docs-brand">
          <span className="docs-mark">H</span>
          <span>{APP_NAME}</span>
        </Link>
        <div className="docs-navlinks">
          <a href="#quickstart">Quickstart</a>
          <a href="#api">API</a>
          <a href="#live">Live mode</a>
          <a href="#pwa">PWA</a>
          <a href="#frontend">Frontend</a>
        </div>
      </nav>

      <section className="docs-hero">
        <div>
          <div className="docs-kicker">Developer documentation</div>
          <h1>{APP_NAME} API and integration guide</h1>
          <p>
            Complete guide untuk menjalankan app, menarik API chat, mengaktifkan Claude plus
            RobinX MCP live mode, membaca response widget, dan mengintegrasikan frontend atau
            service eksternal.
          </p>
        </div>
        <div className="docs-status-panel" aria-label="Runtime modes">
          <div>
            <span className="docs-dot demo" />
            <strong>Demo mode</strong>
            <small>Default. Tidak butuh API key.</small>
          </div>
          <div>
            <span className="docs-dot ready" />
            <strong>Live ready</strong>
            <small>ANTHROPIC_API_KEY tersedia.</small>
          </div>
          <div>
            <span className="docs-dot live" />
            <strong>Live data</strong>
            <small>Claude memakai RobinX MCP tools.</small>
          </div>
        </div>
      </section>

      <section className="docs-grid" id="quickstart">
        <article className="docs-card span-2">
          <h2>Quickstart</h2>
          <p>Install dependencies, start local server, lalu buka app di browser.</p>
          <CodeBlock>{`npm install
npm run dev

# open http://localhost:3000`}</CodeBlock>
        </article>

        <article className="docs-card">
          <h2>Production build</h2>
          <CodeBlock>{`npm run verify
npm start`}</CodeBlock>
          <p>
            `verify` menjalankan lint, unit test, dan production build. Pakai ini sebelum deploy.
          </p>
        </article>

        <article className="docs-card">
          <h2>Current stack</h2>
          <ul className="docs-list">
            <li>Next.js App Router</li>
            <li>React client UI</li>
            <li>API routes in `app/api`</li>
            <li>Google login via Google Identity Services</li>
            <li>Wallet login via EIP-1193 signed message</li>
            <li>Installable PWA with manifest and service worker</li>
            <li>Vitest regression tests</li>
            <li>Optional Claude + RobinX MCP live backend</li>
          </ul>
        </article>
      </section>

      <section className="docs-section" id="api">
        <div className="docs-section-head">
          <div>
            <div className="docs-kicker">HTTP API</div>
            <h2>Endpoints</h2>
          </div>
          <p>
            Base URL saat local development adalah <code>http://localhost:3000</code>. Endpoint
            chat membutuhkan session cookie dari Google atau wallet login.
          </p>
        </div>

        <div className="docs-endpoints">
          {endpoints.map((endpoint) => (
            <article className="docs-endpoint" key={endpoint.path}>
              <div className="docs-endpoint-head">
                <Pill>{endpoint.method}</Pill>
                <code>{endpoint.path}</code>
              </div>
              <h3>{endpoint.title}</h3>
              <div className="docs-two-col">
                <div>
                  <h4>Request</h4>
                  <CodeBlock>{endpoint.body}</CodeBlock>
                </div>
                <div>
                  <h4>Response</h4>
                  <CodeBlock>{endpoint.response}</CodeBlock>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-grid">
        <article className="docs-card span-2">
          <h2>Pull API dengan curl</h2>
          <p>Untuk <code>/api/chat</code>, sertakan cookie session dari browser atau hasil login.</p>
          <CodeBlock>{`curl -sS -X POST http://localhost:3000/api/chat \\
  -H 'content-type: application/json' \\
  -H 'cookie: hoodscope_session=...' \\
  --data '{
    "message": "What can you do?",
    "mode": "Auto",
    "history": []
  }'`}</CodeBlock>
        </article>

        <article className="docs-card span-2">
          <h2>Pull API dari JavaScript</h2>
          <CodeBlock>{`const res = await fetch("/api/chat", {
  method: "POST",
  credentials: "include",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    message: "Show the latest DEX tokens on Robinhood Chain",
    mode: "Deep",
    history: [],
  }),
});

if (!res.ok) throw new Error(await res.text());
const data = await res.json();
console.log(data.source, data.reply);`}</CodeBlock>
        </article>
      </section>

      <section className="docs-grid">
        <article className="docs-card">
          <h2>Request limits</h2>
          <ul className="docs-list">
            <li><code>message</code> wajib string, max 2000 characters.</li>
            <li><code>mode</code> valid: Auto, Fast, Deep.</li>
            <li><code>history</code> max 12 item terakhir.</li>
            <li>Rate limit default: 30 request per IP per 60 detik.</li>
            <li><code>/api/chat</code> mengembalikan 401 jika belum login.</li>
          </ul>
        </article>

        <article className="docs-card">
          <h2>Error response</h2>
          <CodeBlock>{`{ "error": "message (string) is required" }
{ "error": "rate limit exceeded", "retryAfterMs": 41200 }`}</CodeBlock>
          <p>Client harus cek <code>res.ok</code> sebelum membaca response sebagai sukses.</p>
        </article>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <div>
            <div className="docs-kicker">Reply contract</div>
            <h2>Widget response kinds</h2>
          </div>
          <p>
            UI otomatis render widget jika <code>reply.kind</code> adalah salah satu tipe berikut.
            Jika backend memberi shape invalid, client fallback ke demo agent.
          </p>
        </div>
        <div className="docs-kind-grid">
          {replyKinds.map(([kind, desc]) => (
            <div className="docs-kind" key={kind}>
              <code>{kind}</code>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="docs-section" id="live">
        <div className="docs-section-head">
          <div>
            <div className="docs-kicker">Live backend</div>
            <h2>Claude + RobinX MCP</h2>
          </div>
          <p>
            Live mode aktif otomatis saat <code>ANTHROPIC_API_KEY</code> ada. Tanpa key, API tetap
            jalan dalam demo mode.
          </p>
        </div>

        <div className="docs-grid">
          <article className="docs-card span-2">
            <h3>Environment variables</h3>
            <CodeBlock>{`AUTH_SECRET=replace-with-long-random-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_ID=...
ANTHROPIC_API_KEY=sk-ant-...

# optional
ANTHROPIC_MODEL=claude-sonnet-4-20250514
CHAT_TIMEOUT_MS=25000
ROBINX_WALLET_KEY=0x...
ROBINX_MAX_USD_PER_CALL=0.10
ROBINX_ALLOWED_TOOLS=robinx_stats,robinx_verdict,robinx_token
ROBINX_URL=https://api.robinx.io`}</CodeBlock>
          </article>

          <article className="docs-card">
            <h3>Tool behavior</h3>
            <p>
              RobinX MCP exposes coverage stats, deployer reputation, token stats, launch feed,
              leaderboard, and verdict tools. Some tools are paid through x402/USDC.
            </p>
          </article>

          <article className="docs-card">
            <h3>Fallback behavior</h3>
            <p>
              Jika live agent gagal, endpoint tidak mematikan UI. Response kembali ke demo dengan
              <code>source: "demo"</code> dan <code>backend: "demo"</code>.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-section" id="frontend">
        <div className="docs-section-head">
          <div>
            <div className="docs-kicker">Frontend integration</div>
            <h2>Connecting external backends</h2>
          </div>
          <p>
            Dari Settings, isi Backend URL jika ingin UI menarik API dari service lain. Service
            eksternal harus menyediakan kontrak endpoint yang sama.
          </p>
        </div>

        <div className="docs-grid">
          <article className="docs-card">
            <h3>Required external routes</h3>
            <ul className="docs-list">
              <li><code>GET /api/health</code></li>
              <li><code>POST /api/chat</code></li>
              <li><code>GET /api/auth/session</code></li>
              <li>Auth-compatible session cookie if chat is protected.</li>
              <li>Return JSON, not streamed text.</li>
              <li>Use CORS if backend is on another origin.</li>
            </ul>
          </article>

          <article className="docs-card">
            <h3>Status labels</h3>
            <ul className="docs-list">
              <li><strong>Demo mode:</strong> local API reachable, no live credentials.</li>
              <li><strong>Live ready:</strong> live credentials present.</li>
              <li><strong>Live data:</strong> latest chat used live backend.</li>
              <li><strong>Backend offline:</strong> health or chat request failed.</li>
            </ul>
          </article>

          <article className="docs-card span-2">
            <h3>Minimal compatible response</h3>
            <CodeBlock>{`{
  "reply": { "kind": "text", "text": "Hello from your backend" },
  "source": "live",
  "backend": "my-service"
}`}</CodeBlock>
          </article>
        </div>
      </section>

      <section className="docs-section" id="pwa">
        <div className="docs-section-head">
          <div>
            <div className="docs-kicker">Installable app</div>
            <h2>PWA support</h2>
          </div>
          <p>
            {APP_NAME} ships with <code>/manifest.webmanifest</code>, 192/512px icons,
            Apple icon, <code>/sw.js</code>, and an offline fallback page.
          </p>
        </div>

        <div className="docs-grid">
          <article className="docs-card">
            <h3>Install checklist</h3>
            <ul className="docs-list">
              <li>Serve over HTTPS, or <code>localhost</code> during development.</li>
              <li>Open the site once so the service worker can register.</li>
              <li>Browser should show Install App / Add to Home Screen.</li>
              <li>Chat still requires network and authenticated session.</li>
            </ul>
          </article>

          <article className="docs-card">
            <h3>PWA assets</h3>
            <ul className="docs-list">
              <li><code>/manifest.webmanifest</code></li>
              <li><code>/sw.js</code></li>
              <li><code>/pwa-icon-192.png</code></li>
              <li><code>/pwa-icon-512.png</code></li>
              <li><code>/offline</code></li>
            </ul>
          </article>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-callout">
          <div>
            <h2>Security checklist</h2>
            <p>
              Jangan kirim private key, seed phrase, atau secret lewat chat. Simpan API key dan
              AUTH_SECRET hanya di server environment. Wallet login hanya meminta signature pesan;
              gunakan dedicated low-balance wallet untuk x402 paid tools.
            </p>
          </div>
          <Link href="/" className="docs-primary-link">Back to app</Link>
        </div>
      </section>
    </main>
  );
}
