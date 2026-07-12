import Link from "next/link";
import { APP_NAME, CHAIN_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, techArticleLd } from "@/lib/seo";
import styles from "./docs.module.css";

const TITLE = `${APP_NAME} API and integration guide`;
const DESCRIPTION = `Setup, the HTTP API, live RobinX engine + RobinX MCP mode, the on-chain agent surface, and the widget contract — everything needed to point your own frontend at ${APP_NAME}.`;

export const metadata = pageMetadata({
  /* Renders as "Docs — API and integration guide | Bugglo". A bare "Docs" would
     rank for nothing and tell a searcher nothing; the title tag is the single
     strongest on-page signal there is, so it carries the terms people search. */
  title: "Docs — API and integration guide",
  description: DESCRIPTION,
  path: "/docs",
  type: "article",
  keywords: [
    `${APP_NAME} API`,
    "agentic AI API",
    "agentic AI agent tools",
    "build an agentic AI agent",
    `${CHAIN_NAME} API`,
    "chat API",
    "Model Context Protocol",
    "RobinX MCP",
    "developer documentation",
    "on-chain agent tools",
  ],
});

const endpoints = [
  {
    method: "GET",
    path: "/api/health",
    auth: "public",
    title: "Backend health and current mode.",
    body: "No request body.",
    response: `{
  "ok": true,
  "service": "hoodscope-backend",
  "mode": "demo",
  "capabilities": {
    "engine": false,
    "mcp": false,
    "paidToolsEnabled": false
  }
}`,
  },
  {
    method: "POST",
    path: "/api/chat",
    auth: "session required",
    title: "Send a message to the demo or live agent.",
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
  {
    method: "GET",
    path: "/api/auth/session",
    auth: "cookie",
    title: "Read the current auth session.",
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
    auth: "public",
    title: "Log in with a Google ID token.",
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
    auth: "public",
    title: "Create a wallet login challenge.",
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
    auth: "public",
    title: "Verify the signed wallet challenge.",
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
];

const replyKinds = [
  { kind: "text", desc: "Plain assistant response. Shape: { kind, text }." },
  { kind: "rugcheck", desc: "Contract risk widget: risk score, verdict, checks, summary." },
  { kind: "trending", desc: "Trending tokens with mentions, sentiment, change, sparkline." },
  { kind: "sentiment", desc: "Bullish, bearish, and neutral split for a ticker or query." },
  { kind: "wallet", desc: "Wallet stats, labels, and risk flags." },
  { kind: "bundle", desc: "Launch-bundle map: sniper clusters and true insider supply.", planned: true },
  { kind: "deploy", desc: "Deployment preview: constructor args, LP plan, unsigned transaction.", planned: true },
  { kind: "quote", desc: "Swap route, price impact, and the simulated outcome before you sign.", planned: true },
  { kind: "position", desc: "Portfolio X-ray: concentration, correlation, and outstanding approvals.", planned: true },
];

/**
 * The agent's tool surface.
 *
 * `status` is load-bearing and must stay honest — it is the only thing telling a reader
 * whether a tool exists today or whether we are describing intent:
 *
 *   live     → callable in production right now
 *   building → partially wired, not shipped
 *   planned  → designed, not started
 *   research → needs on-chain primitives that do not exist yet
 *
 * The `robinx_*` tools marked live are the ones the model is actually handed, so they must
 * mirror DEFAULT_ALLOWED_TOOLS in lib/liveAgent.js exactly. This list once advertised a
 * "robinx_launches" that no server has ever exposed — a docs page inventing a tool is the
 * one bug here nobody can catch by reading the docs page.
 *
 * Keep this in step with the capability ladder on /intro.
 */
const toolGroups = [
  {
    id: "read",
    title: "Read — chain intelligence",
    prompt: "Who actually bought this launch, and were they all funded by the same wallet?",
    blurb:
      "Everything Bugglo does today lives here. The agent plans its own route across these tools, cross-checks them against each other, and reports where they disagree — a clean verdict from one source is worthless.",
    tools: [
      {
        name: "robinx_token",
        status: "live",
        desc: "Supply, liquidity, holder spread, and lock state for any token on Robinhood Chain.",
      },
      {
        name: "robinx_verdict",
        status: "live",
        desc: "Composite rug-check: contract source, honeypot behaviour, LP lock, ownership powers.",
      },
      {
        name: "robinx_deployer",
        status: "live",
        desc: "The address that shipped the contract, and the thread back to everything else it has ever touched.",
      },
      {
        name: "robinx_stats",
        status: "live",
        desc: "Deployer reputation and the full history of every contract an address has ever shipped.",
      },
      {
        name: "robinx_feed",
        status: "live",
        desc: "The live launch feed — what deployed in the last hour, with liquidity attached to it.",
      },
      {
        name: "robinx_leaderboard",
        status: "live",
        desc: "Ranked movement across the chain, with volume shown next to the liquidity backing it.",
      },
      {
        name: "chain_holder_graph",
        status: "building",
        desc: "Clusters holders by funding path, so one entity standing behind forty wallets reads as one entity.",
      },
      {
        name: "chain_bundle_scan",
        status: "planned",
        desc: "Bundler detection: same-block buy bundles, wallets funded from a single source minutes before launch, sniper clusters, and the real insider allocation hiding behind a \"fair launch\".",
      },
      {
        name: "chain_wash_scan",
        status: "planned",
        desc: "Wash-trading detection: circular transfers, self-crossing fills, and volume that never reaches a new wallet.",
      },
      {
        name: "chain_mempool_watch",
        status: "research",
        desc: "Pending-transaction watch — see the deployer pull liquidity while the transaction is still unconfirmed.",
      },
    ],
  },
  {
    id: "write",
    title: "Write — deploy and token lifecycle",
    prompt: "Launch MYTOKEN, 1B supply, 4% of it to the pool, LP locked 12 months, ownership renounced.",
    blurb:
      "One sentence, one reviewable transaction bundle. The agent assembles the deploy, the pool, the lock, and the renounce — then hands it to your wallet to sign. It never holds a key and it never fires on its own.",
    tools: [
      {
        name: "token_deploy",
        status: "planned",
        desc: "Deploy an ERC-20 from a prompt: name, symbol, supply, decimals, tax rules, with verified source published at deploy time.",
      },
      {
        name: "token_lp_seed",
        status: "planned",
        desc: "Create the pool and seed initial liquidity in the same intent as the deploy, so the token is never live and unbacked.",
      },
      {
        name: "token_lp_lock",
        status: "planned",
        desc: "Lock LP for a stated duration and return the lock receipt the agent can later verify against chain state.",
      },
      {
        name: "token_ownership",
        status: "planned",
        desc: "Renounce ownership, transfer it, or permanently disable mint — each one an explicit state change you sign for.",
      },
      {
        name: "token_airdrop",
        status: "research",
        desc: "Batch distribution against a holder list, previewed down to who receives what before a single transfer leaves.",
      },
    ],
  },
  {
    id: "trade",
    title: "Trade — execution",
    prompt: "Sell half if it 2x. Dump it all if liquidity drops under $100k.",
    blurb:
      "The endgame: you state an outcome, not an order. Research, decision, and execution close into a single loop — behind the ceilings in the next section, because an agent that can spend money without a hard limit is a liability, not a product.",
    tools: [
      {
        name: "trade_quote",
        status: "planned",
        desc: "Route and price a swap across Robinhood Chain DEXes, with the price impact and the route stated up front.",
      },
      {
        name: "trade_simulate",
        status: "planned",
        desc: "Dry-run any transaction against live chain state and report exactly what leaves your wallet — catching approval drains and honeypot sells while walking away is still free.",
      },
      {
        name: "trade_swap",
        status: "planned",
        desc: "Execute the quoted swap. Never auto-fires; the agent prepares it, you sign it.",
      },
      {
        name: "trade_limit",
        status: "planned",
        desc: "Resting limit order — fill at your price or not at all.",
      },
      {
        name: "trade_approvals",
        status: "planned",
        desc: "Every allowance you have ever granted, ranked by what it could cost you, revocable in one call. Most wallets get drained by a signature from eight months ago.",
      },
      {
        name: "trade_conditional",
        status: "research",
        desc: "Standing exits that survive the tab closing: an on-chain intent that settles without you awake and without a centralised bot holding your keys.",
      },
    ],
  },
];

const statusLabel = {
  live: "Live",
  building: "Building",
  planned: "Planned",
  research: "Research",
};

const statusClass = {
  live: styles.statusLive,
  building: styles.statusBuilding,
  planned: styles.status,
  research: styles.status,
};

const statusDotClass = {
  live: styles.dotStatusLive,
  building: styles.dotStatusBuilding,
  planned: styles.dotStatusPlanned,
  research: styles.dotStatusResearch,
};

const legend = [
  ["live", "callable today"],
  ["building", "half-wired, landing soon"],
  ["planned", "designed, not started"],
  ["research", "needs primitives that don't exist yet"],
];

function Code({ label, children }) {
  return (
    <div className={styles.code}>
      {label ? <div className={styles.codeHead}>{label}</div> : null}
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Status({ status }) {
  return (
    <span className={statusClass[status]}>
      <span aria-hidden="true" className={statusDotClass[status]} />
      {statusLabel[status]}
    </span>
  );
}

export default function DocsPage() {
  return (
    <main>
      <JsonLd
        data={[
          techArticleLd({
            title: TITLE,
            description: DESCRIPTION,
            path: "/docs",
            /* Derived from the groups the page actually renders, so a new tool
               group shows up in the structured data without anyone remembering to
               add it in two places. */
            sections: toolGroups.map((group) => group.title),
          }),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: "Docs", path: "/docs" },
          ]),
        ]}
      />
      <header className={styles.hero}>
        <div className={styles.kicker}>Developer documentation</div>
        <h1 className={styles.heroTitle}>{TITLE}</h1>
        <p className={styles.heroLead}>
          How to run the app, call the chat API, turn on the live RobinX engine and RobinX MCP backend,
          read the widget contract, and point your own frontend at it. It also lays out the tool
          surface we are building toward: an agent that does not just read Robinhood Chain, but
          deploys, analyses, and trades on it.
        </p>

        <div className={styles.modes}>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotDemo} />
              Demo mode
            </div>
            <small className={styles.modeNote}>Default. No API key required.</small>
          </div>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotReady} />
              Live ready
            </div>
            <small className={styles.modeNote}>ROBINX_ENGINE_KEY is present.</small>
          </div>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotLive} />
              Live data
            </div>
            <small className={styles.modeNote}>The RobinX engine is calling RobinX MCP tools.</small>
          </div>
        </div>
      </header>

      <section className={styles.section} id="overview">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Overview</div>
          <h2 className={styles.sectionTitle}>What you are integrating with</h2>
        </div>
        <p className={styles.lead}>
          {APP_NAME} is an agentic loop, not a search box. A request is planned by the RobinX engine,
          executed against on-chain tools, and returned as a typed reply the interface knows how
          to render. Without credentials the same endpoints keep working in demo mode, so you can
          build the whole frontend before you ever pay for a token.
        </p>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Stack</h3>
            <ul className={styles.list}>
              <li>Next.js App Router, React client UI</li>
              <li>API routes under <code className={styles.inline}>app/api</code></li>
              <li>Google login via Google Identity Services</li>
              <li>Wallet login via EIP-1193 signed message</li>
              <li>Installable PWA with offline fallback</li>
              <li>Vitest regression tests</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h3>Two backends, one contract</h3>
            <p>
              The demo agent and the live RobinX agent return the same reply shape. If the live
              agent fails, times out, or returns an invalid shape, the response falls back to demo
              rather than breaking the UI — so a missing key degrades the answer, never the app.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="quickstart">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Getting started</div>
          <h2 className={styles.sectionTitle}>Quickstart</h2>
          <p className={styles.lead}>
            Install, run, and open the app. Demo mode needs no keys at all.
          </p>
        </div>
        <div className={styles.grid}>
          <div className={styles.cardWide}>
            <h3>Run it locally</h3>
            <Code label="shell">{`npm install
npm run dev

# open http://localhost:3000`}</Code>
          </div>
          <div className={styles.cardWide}>
            <h3>Ship it</h3>
            <Code label="shell">{`npm run verify   # lint, unit tests, production build
npm start`}</Code>
            <p style={{ marginTop: 12 }}>
              Run <code className={styles.inline}>verify</code> before every deploy. It is the same
              gate CI uses.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="configuration">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Getting started</div>
          <h2 className={styles.sectionTitle}>Configuration</h2>
          <p className={styles.lead}>
            Everything except <code className={styles.inline}>AUTH_SECRET</code> is optional. Add a
            key, get a capability; leave it out, keep demo mode.
          </p>
        </div>
        <Code label=".env.local">{`AUTH_SECRET=replace-with-long-random-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_ID=...

# live mode — all three required, none of them has a default.
# Miss any one and the route stays on the demo agent.
ROBINX_ENGINE_KEY=...
ROBINX_ENGINE_URL=<OpenAI-compatible chat-completions base URL>
ROBINX_ENGINE_MODEL=<model id from your provider>

# optional — spend caps. Over any of them /api/chat returns 429 "Server busy".
ENGINE_MAX_PER_MINUTE=5
ENGINE_MAX_PER_DAY=150
ENGINE_USER_USD_PER_DAY=0.25
ENGINE_GLOBAL_USD_PER_DAY=5
ENGINE_TRUSTED_PROXIES=1

# optional
CHAT_TIMEOUT_MS=25000
ROBINX_URL=https://api.robinx.io
ROBINX_WALLET_KEY=0x...
ROBINX_MAX_USD_PER_CALL=0.10
ROBINX_ALLOWED_TOOLS=robinx_stats,robinx_verdict,robinx_token`}</Code>
      </section>

      <section className={styles.section} id="api">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>HTTP API</div>
          <h2 className={styles.sectionTitle}>Endpoints</h2>
          <p className={styles.lead}>
            Base URL in development is <code className={styles.inline}>http://localhost:3000</code>.
            The chat endpoint requires a session cookie from Google or wallet login.
          </p>
        </div>

        <div className={styles.endpoints}>
          {endpoints.map((endpoint) => (
            <article className={styles.endpoint} key={endpoint.path}>
              <div className={styles.endpointHead}>
                <span
                  className={endpoint.method === "POST" ? styles.methodPost : styles.method}
                >
                  {endpoint.method}
                </span>
                <code className={styles.path}>{endpoint.path}</code>
                <span className={styles.auth}>{endpoint.auth}</span>
              </div>
              <p className={styles.endpointTitle}>{endpoint.title}</p>
              <div className={styles.cols}>
                <Code label="request">{endpoint.body}</Code>
                <Code label="response">{endpoint.response}</Code>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.grid} style={{ marginTop: 14 }}>
          <div className={styles.card}>
            <h3>curl</h3>
            <Code label="shell">{`curl -sS -X POST http://localhost:3000/api/chat \\
  -H 'content-type: application/json' \\
  -H 'cookie: hoodscope_session=...' \\
  --data '{
    "message": "What can you do?",
    "mode": "Auto",
    "history": []
  }'`}</Code>
          </div>
          <div className={styles.card}>
            <h3>JavaScript</h3>
            <Code label="js">{`const res = await fetch("/api/chat", {
  method: "POST",
  credentials: "include",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    message: "Show the latest DEX tokens",
    mode: "Deep",
    history: [],
  }),
});

if (!res.ok) throw new Error(await res.text());
const data = await res.json();
console.log(data.source, data.reply);`}</Code>
          </div>
        </div>
      </section>

      <section className={styles.section} id="reply-kinds">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Reply contract</div>
          <h2 className={styles.sectionTitle}>Widget response kinds</h2>
          <p className={styles.lead}>
            The UI renders a widget automatically when <code className={styles.inline}>reply.kind</code>{" "}
            is one of the kinds below. An invalid shape is rejected before it can reach the UI, and
            the client falls back to the demo agent. Greyed kinds ship alongside the tools in{" "}
            <a href="#agent-surface">the agent surface</a> — they are not live yet.
          </p>
        </div>
        <div className={styles.kinds}>
          {replyKinds.map(({ kind, desc, planned }) => (
            <div className={styles.kind} key={kind}>
              <code className={planned ? styles.kindPlanned : styles.kindName}>
                {kind}
                {planned ? " (planned)" : ""}
              </code>
              <span className={styles.kindDesc}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} id="limits">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>HTTP API</div>
          <h2 className={styles.sectionTitle}>Limits and errors</h2>
        </div>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Request limits</h3>
            <ul className={styles.list}>
              <li><code className={styles.inline}>message</code>: string, max 2000 characters.</li>
              <li><code className={styles.inline}>mode</code>: Auto, Fast, or Deep.</li>
              <li><code className={styles.inline}>history</code>: 12 most recent items.</li>
              <li>Rate limit: 30 requests per IP per 60 seconds.</li>
              <li><code className={styles.inline}>/api/chat</code> returns 401 when signed out.</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h3>Error shape</h3>
            <Code label="json">{`{ "error": "message (string) is required" }
{ "error": "rate limit exceeded", "retryAfterMs": 41200 }`}</Code>
            <p style={{ marginTop: 12 }}>
              Always check <code className={styles.inline}>res.ok</code> before treating a response
              as success.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="live">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The agent</div>
          <h2 className={styles.sectionTitle}>Live mode: RobinX engine + RobinX MCP</h2>
          <p className={styles.lead}>
            Live mode activates on its own the moment{" "}
            <code className={styles.inline}>ROBINX_ENGINE_KEY</code> is set. The engine plans the
            route, calls RobinX MCP tools, and returns a typed reply. Some tools are paid through x402 in
            USDC, which is why the wallet key and the per-call ceiling exist.
          </p>
          <p className={styles.lead}>
            The tool layer itself — what RobinX MCP hands the model, the fleet of servers it is
            cross-checked against, the guardrails around it, and how far it is meant to go — has its
            own page:{" "}
            <Link href="/docs/robinx-mcp" className={styles.link}>
              RobinX MCP
            </Link>
            .
          </p>
        </div>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>What the model is allowed to touch</h3>
            <p>
              Only the tools named in <code className={styles.inline}>ROBINX_ALLOWED_TOOLS</code>. An
              unlisted tool is not visible to the model at all — an allowlist, not a filter applied
              after the fact.
            </p>
          </div>
          <div className={styles.card}>
            <h3>What happens when it breaks</h3>
            <p>
              A failed tool, a timeout, or a malformed reply degrades to the demo agent with{" "}
              <code className={styles.inline}>source: &quot;demo&quot;</code>. The user gets a worse
              answer, never a broken page.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="agent-surface">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The agent</div>
          <h2 className={styles.sectionTitle}>The on-chain agent surface</h2>
          <p className={styles.lead}>
            {APP_NAME} reads Robinhood Chain today. The thing we are actually building is an agent
            that can operate on it end to end: analyse a launch down to the bundle that bought it,
            deploy a token from one sentence, and close the loop by trading — all from the same
            chat box, all against the same guardrails.
          </p>
          <p className={styles.lead}>
            Below is the full tool surface, with the status of each tool stated honestly. Nothing
            here is dressed up as further along than it is. The fastest way to kill a promise is to
            fake it. For the long-form version — how the agent plans across these tools, what stops
            it doing harm, and where the whole thing is pointed — read{" "}
            <Link href="/docs/robinx-mcp" className={styles.link}>
              RobinX MCP
            </Link>
            .
          </p>
        </div>

        <div className={styles.legend}>
          {legend.map(([status, note]) => (
            <span className={styles.legendItem} key={status}>
              <span aria-hidden="true" className={statusDotClass[status]} />
              <strong>{statusLabel[status]}</strong> {note}
            </span>
          ))}
        </div>

        {toolGroups.map((group) => (
          <div className={styles.toolGroup} key={group.id}>
            <div className={styles.toolGroupHead}>
              <h3>{group.title}</h3>
              <p>{group.blurb}</p>
            </div>
            <div style={{ padding: "16px 18px 0" }}>
              <p className={styles.prompt}>
                <span aria-hidden="true" className={styles.caret}>
                  &gt;
                </span>
                {group.prompt}
              </p>
            </div>
            {group.tools.map((tool) => (
              <div className={styles.tool} key={tool.name}>
                <code className={styles.toolName}>{tool.name}</code>
                <p className={styles.toolDesc}>{tool.desc}</p>
                <Status status={tool.status} />
              </div>
            ))}
          </div>
        ))}

        <p className={styles.lead} style={{ marginTop: 22 }}>
          Write and trade tools do not return a signed transaction. They return an{" "}
          <em>unsigned</em> one, plus the simulation of what it would do, and the UI hands it to your
          wallet. The agent proposes; you sign.
        </p>
        <Code label="planned — chat reply for a deploy intent">{`{
  "reply": {
    "kind": "deploy",
    "token": { "name": "MYTOKEN", "symbol": "MYT", "supply": "1000000000" },
    "plan": [
      { "step": "token_deploy",   "verifiedSource": true },
      { "step": "token_lp_seed",  "liquidityUsd": 4000 },
      { "step": "token_lp_lock",  "months": 12 },
      { "step": "token_ownership", "action": "renounce" }
    ],
    "simulation": { "gasUsd": 1.84, "leavesWallet": "4000 USDC + gas" },
    "transactions": ["0x02f8...unsigned"],
    "requiresSignature": true
  },
  "source": "live",
  "backend": "robinx-engine+robinx-mcp"
}`}</Code>
      </section>

      <section className={styles.section} id="guardrails">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The agent</div>
          <h2 className={styles.sectionTitle}>Guardrails</h2>
          <p className={styles.lead}>
            The honest problem with an agent that can spend money is that its worst case is your
            whole wallet. So the worst case has to be enforced somewhere the agent cannot argue with.
            These are the limits the write and trade tools ship behind — and the reason they are not
            live yet.
          </p>
        </div>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>The agent never holds your keys</h3>
            <p>
              Read tools run server-side. Write and trade tools compile to an unsigned transaction
              your wallet signs. There is no custody path, so there is no key to steal from us.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Simulate before signature</h3>
            <p>
              Every state-changing call is dry-run against live chain state first, and the UI shows
              exactly what leaves your wallet. Approval drains and honeypot sells are caught while
              walking away is still free.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Tool allowlist and spend ceiling</h3>
            <p>
              <code className={styles.inline}>ROBINX_ALLOWED_TOOLS</code> bounds what the model can
              reach; <code className={styles.inline}>ROBINX_MAX_USD_PER_CALL</code> bounds what a
              paid tool call may cost. Both are enforced server-side, outside the model&apos;s reach.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Spend-cap vault <Status status="research" /></h3>
            <p>
              For autonomous execution, a ceiling in the environment is not enough — it has to be a
              number on-chain that the agent physically cannot exceed. That is a contract we have to
              write and get audited, and we will not ship autonomous trading until it exists.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="frontend">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Integrate</div>
          <h2 className={styles.sectionTitle}>Point the UI at your own backend</h2>
          <p className={styles.lead}>
            Set a Backend URL in Settings and the interface will call your service instead. It has to
            honour the same contract.
          </p>
        </div>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Required routes</h3>
            <ul className={styles.list}>
              <li><code className={styles.inline}>GET /api/health</code></li>
              <li><code className={styles.inline}>POST /api/chat</code></li>
              <li><code className={styles.inline}>GET /api/auth/session</code></li>
              <li>A compatible session cookie if chat is protected.</li>
              <li>JSON responses, not streamed text.</li>
              <li>CORS headers if you serve from another origin.</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h3>Status labels in the UI</h3>
            <ul className={styles.list}>
              <li><strong>Demo mode</strong> — API reachable, no live credentials.</li>
              <li><strong>Live ready</strong> — credentials present.</li>
              <li><strong>Live data</strong> — the last reply came from the live backend.</li>
              <li><strong>Backend offline</strong> — health or chat request failed.</li>
            </ul>
          </div>
          <div className={styles.cardWide}>
            <h3>The smallest response that works</h3>
            <Code label="json">{`{
  "reply": { "kind": "text", "text": "Hello from your backend" },
  "source": "live",
  "backend": "my-service"
}`}</Code>
          </div>
        </div>
      </section>

      <section className={styles.section} id="pwa">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Integrate</div>
          <h2 className={styles.sectionTitle}>Install as an app</h2>
          <p className={styles.lead}>
            {APP_NAME} ships a manifest, 192 and 512px icons, an Apple touch icon, a service worker,
            and an offline fallback page.
          </p>
        </div>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Install checklist</h3>
            <ul className={styles.list}>
              <li>Serve over HTTPS, or <code className={styles.inline}>localhost</code> in dev.</li>
              <li>Load the site once so the service worker registers.</li>
              <li>The browser then offers Install App / Add to Home Screen.</li>
              <li>Chat still needs network and an authenticated session.</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h3>Assets</h3>
            <ul className={styles.list}>
              <li><code className={styles.inline}>/manifest.webmanifest</code></li>
              <li><code className={styles.inline}>/sw.js</code></li>
              <li><code className={styles.inline}>/pwa-icon-192.png</code></li>
              <li><code className={styles.inline}>/pwa-icon-512.png</code></li>
              <li><code className={styles.inline}>/offline</code></li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section} id="security">
        <div className={styles.callout}>
          <div>
            <h2>Security</h2>
            <p>
              Never send a private key or seed phrase through chat — no {APP_NAME} feature will ever
              ask for one, and any prompt that does is an attack. Keep{" "}
              <code className={styles.inline}>ROBINX_ENGINE_KEY</code> and{" "}
              <code className={styles.inline}>AUTH_SECRET</code> in the server environment only.
              Wallet login asks for a message signature and nothing else. If you enable x402 paid
              tools, fund a dedicated low-balance wallet — never your main one.
            </p>
          </div>
          <Link href="/" className={styles.cta}>
            Try {APP_NAME}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
