import Link from "next/link";
import { APP_NAME, CHAIN_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, techArticleLd, faqPageLd } from "@/lib/seo";
import styles from "../docs.module.css";

const TITLE = "RobinX MCP — the tool layer that lets an AI agent act on Robinhood Chain";
const DESCRIPTION = `RobinX MCP is the Model Context Protocol server that gives ${APP_NAME} live hands on ${CHAIN_NAME}: token risk, rug verdicts, deployer reputation, launch feeds and leaderboards, called autonomously by Claude inside an agentic loop. This is what it does today, how it is guarded, and how far it goes.`;

export const metadata = pageMetadata({
  /* The head term is "RobinX MCP", but almost nobody cold-searches a brand they have
     never heard of. The title carries the category it genuinely belongs to — MCP
     server, on-chain AI agent tools — so the page can be found by people describing
     the problem rather than naming the product. */
  title: "RobinX MCP — on-chain tools for agentic AI",
  description: DESCRIPTION,
  path: "/docs/robinx-mcp",
  type: "article",
  keywords: [
    "RobinX MCP",
    "MCP server",
    "Model Context Protocol",
    "Model Context Protocol crypto",
    "MCP server for blockchain",
    "agentic AI tools",
    "AI agent tool calling",
    "on-chain agent tools",
    `AI agent for ${CHAIN_NAME}`,
    `${CHAIN_NAME} MCP`,
    "Claude MCP crypto",
    "rug check API",
    "deployer reputation",
    "x402 micropayments",
    `${APP_NAME} MCP`,
  ],
});

/* The six tools the model is actually allowed to see today. This list is not
   decorative — it mirrors DEFAULT_ALLOWED_TOOLS in lib/liveAgent.js, and if the two
   drift apart the docs are lying about the product's entire attack surface. */
const registry = [
  {
    name: "robinx_verdict",
    status: "live",
    line: "Is this safe?",
    desc: "The composite rug-check. Contract source, honeypot behaviour, LP lock state, and the powers ownership still holds — folded into one verdict with the evidence still attached to it.",
  },
  {
    name: "robinx_token",
    status: "live",
    line: "What is this token, really?",
    desc: "Supply, liquidity, holder spread, and lock state for any token on the chain. The numbers a chart is drawn on top of, before anyone has drawn the chart.",
  },
  {
    name: "robinx_deployer",
    status: "live",
    line: "Who is behind it?",
    desc: "The address that shipped the contract, and the thread back to everything else it has ever touched. Tokens do not rug. People do.",
  },
  {
    name: "robinx_stats",
    status: "live",
    line: "Have they done this before?",
    desc: "Deployer reputation across their full deployment history. Six launches, one honeypot, and a pattern you can see before you are inside it.",
  },
  {
    name: "robinx_feed",
    status: "live",
    line: "What just landed?",
    desc: "The live launch feed — what deployed in the last hour, with the liquidity actually attached to it rather than the liquidity promised in the announcement.",
  },
  {
    name: "robinx_leaderboard",
    status: "live",
    line: "What is moving?",
    desc: "Ranked movement across the chain. Volume next to liquidity, because volume without liquidity is a trap with a chart on it.",
  },
];

/* Every server in mcp.json, described by what it is FOR rather than by its transport.
   `disabled: true` entries stay listed on purpose — a reader deciding whether to
   trust this fleet deserves to see what we deliberately left switched off. */
const fleet = [
  { name: "blockscout", role: "Contract source, ABIs, transactions, deployer trail", transport: "HTTP", state: "on" },
  { name: "dexscreener", role: "Price, volume, liquidity, pair-level market data", transport: "stdio", state: "on" },
  { name: "boo-crypto", role: "Rug-check, honeypot behaviour, sanctions screening", transport: "stdio", state: "on" },
  { name: "whale-intel", role: "Holder analysis, whale tracking, wallet clusters", transport: "HTTP", state: "on" },
  { name: "boar-basic", role: "General chain intelligence — the cheap first pass", transport: "HTTP", state: "on" },
  { name: "boar-advanced", role: "Deeper forensics when the first pass finds something", transport: "HTTP", state: "on" },
  { name: "etherscan", role: "Fallback contract data when Blockscout is down", transport: "stdio", state: "on" },
  { name: "fuse", role: "Cross-chain context for anything with a bridge in its past", transport: "HTTP", state: "on" },
  { name: "hooddomains", role: ".hood name resolution, so wallets have names", transport: "stdio", state: "on" },
  { name: "hoodpocket", role: "Wallet operations — deliberately switched off", transport: "stdio", state: "off" },
];

/* The agent's thinking protocol, verbatim in shape from lib/systemPrompt.js. It is
   printed here because it is the actual product: any model can call one tool, and
   the loop is the only thing separating an answer from a guess with a citation. */
const phases = [
  {
    n: "01",
    name: "Observe",
    body: "What is being asked, what is already known, and what is missing. The agent names the gap before it moves to fill it.",
  },
  {
    n: "02",
    name: "Analyze",
    body: "Patterns, anomalies, risks, opportunities. The shape of the question decides which tools are even worth calling.",
  },
  {
    n: "03",
    name: "Plan",
    body: "Which tool first, in what order, and — the part most agents skip — what to do when one of them fails.",
  },
  {
    n: "04",
    name: "Act",
    body: "Call the tools. Collect the data. RobinX MCP and the rest of the fleet are hit in the order the plan chose, not the order they were registered.",
  },
  {
    n: "05",
    name: "Verify",
    body: "Cross-check every claim against an independent source and report where they disagree. A clean verdict from one source is worthless.",
  },
  {
    n: "06",
    name: "Refine",
    body: "What was missed, what to ask next, what to carry into the next question. The loop closes, or it runs again.",
  },
];

/* Written as horizons rather than dates. A roadmap with dates on it is a promise you
   will break in public; a roadmap with honest statuses is a bet a reader can price. */
const horizons = [
  {
    id: "read",
    era: "Today",
    title: "Read — the chain, cross-examined",
    status: "live",
    body: "Six RobinX tools and nine external MCP servers, planned across by the model and checked against each other. This ships, right now, in production. Everything below is built on it.",
    proof: "Rug-check, deployer forensics, launch feed, leaderboard, holder spread, honeypot behaviour.",
  },
  {
    id: "forensics",
    era: "Next",
    title: "Forensics — the lies a chart cannot tell",
    status: "building",
    body: "Holder clustering by funding path, bundler and sniper detection, wash-trade detection. Forty independent buyers who all took gas from one wallet six minutes before launch are not forty buyers — they are one entity wearing forty hats, and the first three blocks of a launch cannot lie about it.",
    proof: "chain_holder_graph, chain_bundle_scan, chain_wash_scan",
  },
  {
    id: "write",
    era: "Then",
    title: "Write — launch from one sentence",
    status: "planned",
    body: "\"Launch MYTOKEN, 1B supply, LP locked 12 months, ownership renounced.\" The agent assembles the deploy, the pool, the lock, and the renounce into one reviewable bundle with verified source, simulates it, and hands it to your wallet. It never holds a key. It proposes; you sign.",
    proof: "token_deploy, token_lp_seed, token_lp_lock, token_ownership",
  },
  {
    id: "trade",
    era: "Then",
    title: "Trade — close the loop",
    status: "planned",
    body: "Research and execution stop being two tabs. Quote the route, state the price impact, dry-run it against live chain state, show exactly what leaves the wallet — and only then offer it for signature. Nothing auto-fires.",
    proof: "trade_quote, trade_simulate, trade_swap, trade_approvals",
  },
  {
    id: "standing",
    era: "The bet",
    title: "Standing agents — a prompt that outlives the tab",
    status: "planned",
    body: "\"Watch this deployer. Wake me the second he launches again.\" The agent holds the watch after you close the laptop and pushes you the moment its condition trips. This is the line between a chatbot and something that works for you while you sleep.",
    proof: "Persistent intents, push delivery, condition triggers.",
  },
  {
    id: "server",
    era: "The bet",
    title: "RobinX MCP as a server anyone can call",
    status: "planned",
    body: "Flip the arrow. Today Bugglo is an MCP client that consumes tools. The prize is being the tool: point Claude Desktop, Cursor, or your own agent at RobinX MCP and call rug-check, deployer history, and chain state as primitives inside whatever you are building. Every agent that plugs in makes the chain more legible to every other one.",
    proof: "Public MCP endpoint, scoped keys, per-tool metering.",
  },
  {
    id: "ceiling",
    era: "Research",
    title: "Execution behind a ceiling the agent cannot argue with",
    status: "research",
    body: "\"You may trade. You may not lose more than $200.\" An environment variable is not a guarantee — it is a suggestion enforced by the same process the agent runs in. A real ceiling is a number on-chain that the agent physically cannot exceed. That is a contract we have to write and have audited, and autonomous execution does not ship until it exists.",
    proof: "Spend-cap vault. Audited, or not shipped.",
  },
  {
    id: "economy",
    era: "Research",
    title: "Agent pays agent",
    status: "research",
    body: "x402 already lets the agent buy the premium forensics it needs mid-thought. Run it in reverse and RobinX sells its own verdicts to other agents, priced per call, settled in USDC. A machine economy where the unit of trade is a well-researched answer and the currency of reputation is being right in public.",
    proof: "x402 in both directions, on-chain verdict history.",
  },
];

const faqs = [
  {
    question: "What is RobinX MCP?",
    answer: `RobinX MCP is a Model Context Protocol server that exposes ${CHAIN_NAME} as a set of tools an AI agent can call directly — token data, rug verdicts, deployer reputation, launch feeds, and leaderboards. ${APP_NAME} connects to it over stdio and lets Claude decide, on its own, which of those tools to call and in what order.`,
  },
  {
    question: "What is the Model Context Protocol?",
    answer:
      "The Model Context Protocol (MCP) is an open standard for connecting AI models to external tools and data. Instead of writing a bespoke integration for every model and every data source, a tool is published once as an MCP server and any MCP-capable client can call it. It is the difference between a model that talks about a blockchain and a model that can query one.",
  },
  {
    question: "How is this different from a chatbot with a crypto API bolted on?",
    answer:
      "A chatbot calls one endpoint and repeats the answer. The agent plans a route across ten independent sources, executes it, cross-checks each claim against a second source, reports where they disagree, and reroutes when a tool fails. A clean verdict from a single source is worthless — the cross-examination is the product.",
  },
  {
    question: "Can the agent move my funds?",
    answer: `No. ${APP_NAME} is a read-only intelligence agent today. Tools whose names imply a state change — send, transfer, sign, approve, swap, deploy — are stripped out before the model ever sees them, and the model can only see tools that appear on an explicit server-side allowlist. Write and trade tools, when they ship, will return an unsigned transaction that your wallet signs. The agent proposes; you sign.`,
  },
  {
    question: "Do RobinX MCP tools cost money?",
    answer:
      "Some tools are paid through x402 in USDC. Without a wallet key configured, a paid tool returns a price probe instead of data rather than silently spending anything. When a wallet key is configured, a per-call ceiling bounds what any single call may cost, enforced server-side and outside the model's reach.",
  },
  {
    question: "Can I point my own agent at RobinX MCP?",
    answer: `Not yet — that is on the roadmap. Today ${APP_NAME} is an MCP client that consumes tools. Exposing RobinX MCP as a public server that Claude Desktop, Cursor, or your own agent can call is a planned capability, not a live one.`,
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

export default function RobinXMcpPage() {
  return (
    <main>
      <JsonLd
        data={[
          techArticleLd({
            title: TITLE,
            description: DESCRIPTION,
            path: "/docs/robinx-mcp",
            sections: [
              "What RobinX MCP is",
              "The agentic loop",
              "Tool registry",
              "The MCP fleet",
              "Safety model",
              "Roadmap",
            ],
          }),
          /* The same six answers a reader sees below, so the rich result and the page
             cannot disagree — Google drops FAQ markup that does not match the copy. */
          faqPageLd(faqs, "/docs/robinx-mcp"),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "RobinX MCP", path: "/docs/robinx-mcp" },
          ]),
        ]}
      />

      <header className={styles.hero}>
        <div className={styles.kicker}>The weapon</div>
        <h1 className={styles.heroTitle}>RobinX MCP</h1>
        <p className={styles.heroLead}>
          A language model without tools is a rumour engine. It can describe a blockchain
          beautifully and it cannot read one. RobinX MCP is the layer that closes that gap: it hands{" "}
          {APP_NAME} live hands on {CHAIN_NAME} — token state, rug verdicts, deployer history,
          launches as they land — and lets the agent decide for itself which of them to reach for.
          This page is the whole story: what it does today, what stops it doing harm, and how far we
          intend to take it.
        </p>

        <div className={styles.modes}>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotLive} />6 tools
            </div>
            <small className={styles.modeNote}>RobinX MCP, callable in production today.</small>
          </div>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotReady} />9 servers
            </div>
            <small className={styles.modeNote}>External MCP fleet, cross-checking each other.</small>
          </div>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotDemo} />0 keys held
            </div>
            <small className={styles.modeNote}>Read-only. The agent has nothing to sign with.</small>
          </div>
        </div>
      </header>

      <section className={styles.section} id="what">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The idea</div>
          <h2 className={styles.sectionTitle}>What RobinX MCP actually is</h2>
        </div>
        <p className={styles.lead}>
          The Model Context Protocol is an open standard for handing a model tools. Publish a
          capability once as an MCP server and any MCP-capable client — Claude, Cursor, your own
          agent — can call it without a bespoke integration. It is a port, not a plug: the thing you
          build against once instead of rewriting for every model that ships next quarter.
        </p>
        <p className={styles.lead}>
          <strong>RobinX MCP is that port for {CHAIN_NAME}.</strong> It takes a chain — an append-only
          ledger that answers only the questions you already know how to ask — and turns it into
          something an agent can interrogate. Not an endpoint the app calls on the user&apos;s behalf.
          A tool the <em>model</em> calls, on its own initiative, mid-thought, because it decided the
          answer required it.
        </p>
        <p className={styles.prompt}>
          <span aria-hidden="true" className={styles.caret}>
            &gt;
          </span>
          Is 0x7f3a…c9d2 safe to ape?
        </p>
        <p className={styles.lead}>
          Nobody wired that sentence to a function. The agent read it, decided it needed the contract
          source, the liquidity lock, the holder concentration, and the deployer&apos;s history,
          called four different tools to get them, noticed that two of them disagreed, and said so.
          That is the entire difference between a search box and an agent, and RobinX MCP is what
          makes the second one possible.
        </p>
      </section>

      <section className={styles.section} id="loop">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>How it thinks</div>
          <h2 className={styles.sectionTitle}>The loop is the product</h2>
          <p className={styles.lead}>
            Any model can call one tool. What makes {APP_NAME} dangerous is that it refuses to stop
            at one. Every question runs through a six-phase protocol before an answer is allowed out
            — and the phase most agents skip is the fifth.
          </p>
        </div>

        <div className={styles.phases}>
          {phases.map((phase) => (
            <div className={styles.phase} key={phase.n}>
              <div className={styles.phaseNum}>{phase.n}</div>
              <div>
                <h3 className={styles.phaseName}>{phase.name}</h3>
                <p className={styles.phaseBody}>{phase.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.grid} style={{ marginTop: 14 }}>
          <div className={styles.card}>
            <h3>Cross-examination, not citation</h3>
            <p>
              One source saying a token is clean tells you one source has been fooled. The agent
              checks DexScreener&apos;s liquidity against the chain&apos;s own balance, the honeypot
              flag against an actual transaction trace, the holder graph against the deployer&apos;s
              funding trail — and reports the contradiction rather than laundering it into a
              confident average.
            </p>
          </div>
          <div className={styles.card}>
            <h3>It reroutes when a tool dies</h3>
            <p>
              Blockscout goes down; Etherscan answers instead. A paid tool returns a price probe;
              the agent says so rather than inventing the number it wanted. The plan survives its
              own tools failing, because on-chain tools fail constantly and an agent that cannot
              survive that is a demo.
            </p>
          </div>
        </div>

        <p className={styles.lead} style={{ marginTop: 14 }}>
          The loop runs up to four iterations in <code className={styles.inline}>Auto</code> and{" "}
          <code className={styles.inline}>Fast</code>, and up to six in{" "}
          <code className={styles.inline}>Deep</code> — each iteration free to call more tools based
          on what the last one returned. Depth is a dial, not a marketing word.
        </p>
      </section>

      <section className={styles.section} id="registry">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The tools</div>
          <h2 className={styles.sectionTitle}>What RobinX MCP hands the model</h2>
          <p className={styles.lead}>
            Six tools, all live in production, all read-only. Each one is a question a trader asks
            out loud at three in the morning with money already on the line.
          </p>
        </div>

        <div className={styles.toolGroup}>
          {registry.map((tool) => (
            <div className={styles.tool} key={tool.name}>
              <code className={styles.toolName}>{tool.name}</code>
              <p className={styles.toolDesc}>
                <strong className={styles.toolLine}>{tool.line}</strong> {tool.desc}
              </p>
              <Status status={tool.status} />
            </div>
          ))}
        </div>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          The model never sees a tool that is not on this list. It is an allowlist, not a filter
          applied after the fact — an unlisted tool is invisible, which means the model cannot be
          talked into calling it. Set{" "}
          <code className={styles.inline}>ROBINX_ALLOWED_TOOLS</code> to narrow it further.
        </p>
      </section>

      <section className={styles.section} id="fleet">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The tools</div>
          <h2 className={styles.sectionTitle}>RobinX does not work alone</h2>
          <p className={styles.lead}>
            RobinX MCP is the native tool layer for {CHAIN_NAME}. Around it,{" "}
            <code className={styles.inline}>mcp.json</code> mounts a fleet of independent MCP servers
            — each one a different way of being right, and a different way of being wrong. The agent
            plays them against each other. Add a server to that file and the agent can use it on the
            next boot; no code change, no redeploy of the model.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Server</th>
                <th>What it is for</th>
                <th>Transport</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((server) => (
                <tr key={server.name}>
                  <td>
                    <code className={styles.toolName}>{server.name}</code>
                  </td>
                  <td>{server.role}</td>
                  <td className={styles.tableDim}>{server.transport}</td>
                  <td>
                    {server.state === "on" ? (
                      <span className={styles.statusLive}>
                        <span aria-hidden="true" className={styles.dotStatusLive} />
                        On
                      </span>
                    ) : (
                      <span className={styles.status}>
                        <span aria-hidden="true" className={styles.dotStatusPlanned} />
                        Off
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          <code className={styles.inline}>hoodpocket</code> is a wallet server, and it is switched
          off on purpose. It is listed here rather than quietly deleted, because a fleet you are
          asked to trust should show you what it chose not to load.
        </p>

        <Code label="mcp.json — adding a server">{`{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["-y", "your-mcp-server@1.0.0"],

      // Only these env vars reach the child process. Not your whole environment.
      "envFrom": ["YOUR_API_KEY"],

      // Optional. Without it, state-changing tools are dropped automatically.
      "allowedTools": ["your_read_tool"]
    }
  }
}`}</Code>
      </section>

      <section className={styles.section} id="safety">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The guardrails</div>
          <h2 className={styles.sectionTitle}>Why this is a weapon and not a liability</h2>
          <p className={styles.lead}>
            An agent that can call arbitrary tools over untrusted data is, by default, a security
            incident with a chat interface. Four things stop that, and all four are enforced in the
            server, outside the model&apos;s reach — because a guardrail the model can talk its way
            past is not a guardrail, it is a suggestion.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Mutating tools are stripped on sight</h3>
            <p>
              Every tool a server advertises is matched against a deny-pattern —{" "}
              <code className={styles.inline}>send</code>,{" "}
              <code className={styles.inline}>transfer</code>,{" "}
              <code className={styles.inline}>sign</code>,{" "}
              <code className={styles.inline}>approve</code>,{" "}
              <code className={styles.inline}>swap</code>,{" "}
              <code className={styles.inline}>deploy</code>,{" "}
              <code className={styles.inline}>withdraw</code> and their relatives. A matching tool is
              dropped before the model is told it exists. A server that wants one has to opt in by
              name in <code className={styles.inline}>allowedTools</code>.
            </p>
          </div>
          <div className={styles.card}>
            <h3>MCP servers get a starved environment</h3>
            <p>
              Servers run as child processes and their output is untrusted. They never receive the
              process environment — no <code className={styles.inline}>ANTHROPIC_API_KEY</code>, no{" "}
              <code className={styles.inline}>AUTH_SECRET</code>, no wallet key. Each server is
              handed only the variables it explicitly declared, on top of a minimal safe default.
            </p>
          </div>
          <div className={styles.card}>
            <h3>The agent holds no keys</h3>
            <p>
              Read tools run server-side. When write and trade tools land, they compile to an{" "}
              <em>unsigned</em> transaction that your wallet signs. There is no custody path, which
              means there is no key here to steal.
            </p>
          </div>
          <div className={styles.card}>
            <h3>A ceiling on what a thought may cost</h3>
            <p>
              Paid tools settle in USDC over x402.{" "}
              <code className={styles.inline}>ROBINX_MAX_USD_PER_CALL</code> bounds what any single
              call may spend. Leave the wallet key out entirely and a paid tool returns a price probe
              instead of data — it cannot spend money you did not hand it.
            </p>
          </div>
        </div>

        <Code label=".env.local — the whole live-mode surface">{`ANTHROPIC_API_KEY=sk-ant-...          # turns live mode on
ANTHROPIC_MODEL=claude-sonnet-4-20250514
CHAT_TIMEOUT_MS=25000

ROBINX_ALLOWED_TOOLS=robinx_verdict,robinx_token,robinx_deployer
ROBINX_WALLET_KEY=0x...               # optional — enables paid tools
ROBINX_MAX_USD_PER_CALL=0.10          # the ceiling on any single call`}</Code>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          And when it breaks — a dead server, a timeout, a malformed reply — the response degrades to
          the demo agent rather than to a stack trace. The user gets a worse answer. Never a broken
          page.
        </p>
      </section>

      <section className={styles.section} id="x402">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The strange part</div>
          <h2 className={styles.sectionTitle}>An agent that buys its own data</h2>
        </div>
        <p className={styles.lead}>
          Some RobinX tools are paid, settled in USDC over x402, mid-thought, without a human in the
          loop. The agent decides the forensics are worth ten cents and buys them. This is a small
          detail with a very large shadow: the moment an agent can pay for information, the price of
          an answer becomes a thing it can reason about — and the moment it can be <em>paid</em>, its
          answers become a thing other agents can buy.
        </p>
        <p className={styles.lead}>
          We run the first half today. The second half — RobinX selling its verdicts to other agents,
          priced per call — is the machine economy this whole thing is pointed at, and it is in the
          research column below, where honest people put the things they have not built yet.
        </p>
      </section>

      <section className={styles.section} id="roadmap">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Where this goes</div>
          <h2 className={styles.sectionTitle}>The ladder: read, then write, then act</h2>
          <p className={styles.lead}>
            Reading a chain is the floor, not the ceiling. The endgame is an agent you give an
            outcome to instead of an order — one that researches, decides, and executes inside a
            single loop, behind limits it physically cannot exceed.
          </p>
          <p className={styles.lead}>
            Every rung below carries an honest status. Nothing here is dressed up as further along
            than it is, because the fastest way to kill a promise is to fake having kept it.
          </p>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span aria-hidden="true" className={styles.dotStatusLive} />
            <strong>Live</strong> callable today
          </span>
          <span className={styles.legendItem}>
            <span aria-hidden="true" className={styles.dotStatusBuilding} />
            <strong>Building</strong> half-wired, landing soon
          </span>
          <span className={styles.legendItem}>
            <span aria-hidden="true" className={styles.dotStatusPlanned} />
            <strong>Planned</strong> designed, not started
          </span>
          <span className={styles.legendItem}>
            <span aria-hidden="true" className={styles.dotStatusResearch} />
            <strong>Research</strong> needs primitives that don&apos;t exist yet
          </span>
        </div>

        <ol className={styles.ladder}>
          {horizons.map((rung) => (
            <li className={styles.rung} key={rung.id}>
              <div className={styles.rungHead}>
                <span className={styles.rungEra}>{rung.era}</span>
                <Status status={rung.status} />
              </div>
              <h3 className={styles.rungTitle}>{rung.title}</h3>
              <p className={styles.rungBody}>{rung.body}</p>
              <p className={styles.rungProof}>{rung.proof}</p>
            </li>
          ))}
        </ol>

        <p className={styles.lead} style={{ marginTop: 22 }}>
          The through-line: <strong>every rung makes the one above it safer to climb.</strong> You do
          not get to let an agent trade until it can read a launch well enough to know it is a trap,
          and you do not get to let it trade unsupervised until the worst case is a number on-chain
          rather than a promise in a config file. That order is not caution. It is the only order
          that works.
        </p>
      </section>

      <section className={styles.section} id="mcp-faq">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Questions</div>
          <h2 className={styles.sectionTitle}>The six people actually ask</h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <div className={styles.faqItem} key={faq.question}>
              <h3 className={styles.faqQuestion}>{faq.question}</h3>
              <p className={styles.faqAnswer}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} id="mcp-next">
        <div className={styles.callout}>
          <div>
            <h2>Point it at something</h2>
            <p>
              The tool surface, the reply contract, and the setup for live mode are in{" "}
              <Link href="/docs" className={styles.link}>
                the main documentation
              </Link>
              . The capability ladder — written as the sentences you would actually type — is on{" "}
              <Link href="/intro" className={styles.link}>
                the intro page
              </Link>
              . Or skip both and go ask it something with money on the line.
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
