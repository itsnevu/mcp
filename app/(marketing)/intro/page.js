import Link from "next/link";
import { APP_NAME, CHAIN_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, softwareApplicationLd, techArticleLd } from "@/lib/seo";
import Roadmap from "./Roadmap";
import shell from "../marketing.module.css";
import styles from "./intro.module.css";

const TITLE = `Introducing ${APP_NAME}`;
const DESCRIPTION = `${APP_NAME} is an agentic AI for ${CHAIN_NAME} intelligence — conversational rug checks, deployer reputation, wallet analysis, and market moves, grounded in live on-chain data.`;

/* The dateline the page itself renders. Kept next to the metadata so the article's
   published date and the date a reader sees cannot drift apart. */
const PUBLISHED = "2026-07-12";

export const metadata = pageMetadata({
  /* Absolute, because the template would otherwise append the brand a second time
     and drop the category. The separator is a pipe, matching SITE_TITLE — every
     title this site emits separates brand from category with "|", never a dash. */
  absoluteTitle: `Introducing ${APP_NAME} | Agentic AI for ${CHAIN_NAME}`,
  description: DESCRIPTION,
  path: "/intro",
  type: "article",
  publishedTime: PUBLISHED,
  keywords: [
    `what is ${APP_NAME}`,
    "agentic AI",
    "agentic AI crypto",
    `agentic AI ${CHAIN_NAME}`,
    "autonomous AI agent",
    "AI agent on-chain analysis",
    `${CHAIN_NAME} AI`,
    "rug check AI",
    "on-chain analysis assistant",
    "RobinX MCP",
  ],
});

const methodSteps = [
  {
    number: "01",
    title: "Natural Language Processing Engine",
    body: `Unlike traditional block explorers that require precise hex addresses and complex filter parameters, ${APP_NAME} accepts queries exactly the way you would ask a human analyst. Whether you paste a smart contract address, mention a ticker symbol, or describe a broad market phenomenon, the NLP engine parses your intent, extracts relevant on-chain entities, and determines the optimal analytical approach. Slash commands like /rugcheck and /trending exist for power users who want to bypass the NLP routing.`,
  },
  {
    number: "02",
    title: "Autonomous Agentic Planning",
    body: "Once your intent is understood, the RobinX engine acts as an autonomous agent. It breaks your request down into a multi-step execution plan. If you ask for a 'deep dive on the deployer of Token X', the agent first plans to resolve the token address, then query the deployer address, and finally scan the deployer's historical transaction graph across the Robinhood Chain. This happens in milliseconds.",
  },
  {
    number: "03",
    title: "Live On-Chain Data via RobinX MCP",
    body: "The agent executes its plan by calling specialized tools via the Model Context Protocol (MCP). These aren't generic web searches. The agent is directly probing live RPC nodes, smart contract states, liquidity pools, and historical indexers to fetch deployer reputation scores, token holder distributions, and live price feeds. The data is pulled straight from the blockchain.",
  },
  {
    number: "04",
    title: "Structured, Actionable Intelligence",
    body: `Raw blockchain data is notoriously difficult to read. Instead of returning a wall of JSON or a dense paragraph of text, ${APP_NAME} synthesizes the data into highly structured, purpose-built UI widgets. Responses come back as interactive risk gauges, trending tables with sparkline charts, sentiment bars, and comprehensive wallet statistic tiles. Every single claim is backed by the on-chain data fetched in step three.`,
  },
];

const limitations = [
  {
    text: `Probabilistic Signals: ${APP_NAME} can produce plausible-sounding but incorrect or incomplete analysis. On-chain signals are inherently probabilistic. A 'clean' rug check report is not a guarantee of safety (as malicious code can be heavily obfuscated), and a flagged report is not absolute proof of fraud. Always conduct your own secondary research.`,
  },
  {
    text: "Paid Tool Access: Advanced RobinX MCP tools (such as deep deployer forensic scans) are paid via x402/USDC microtransactions. Without a funded wallet key configured in the backend environment, those specific tools will return a price probe error instead of data, and the agent will notify you of the restriction.",
    footnote: 1,
  },
  {
    text: "Rate Limiting & Quotas: To ensure system stability and fair usage during the research preview, conversations are strictly rate-limited to 30 requests per minute per IP address. Additionally, user messages are capped at 2,000 characters to prevent context-window overflow.",
  },
  {
    text: `No Financial Advice: Nothing ${APP_NAME} produces constitutes financial, legal, or investment advice. It is strictly an analytical research tool. All trading decisions and their financial consequences remain entirely your responsibility.`,
  },
  {
    text: "Latency: Complex queries requiring multiple sequential MCP tool calls (e.g., tracing funds through multiple wallets) may take up to 20 seconds to resolve. The UI will display a loading indicator while the agent processes the chain data.",
  }
];

export default function IntroPage() {
  return (
    <main>
      <JsonLd
        data={[
          techArticleLd({
            title: TITLE,
            description: DESCRIPTION,
            path: "/intro",
            sections: methodSteps.map((step) => step.title),
          }),
          softwareApplicationLd(),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: TITLE, path: "/intro" },
          ]),
        ]}
      />
      <section className={styles.hero}>
        <p className={styles.kicker}>
          <span>Product</span>
          <span aria-hidden="true" className={styles.kickerDot} />
          <time dateTime={PUBLISHED}>July 12, 2026</time>
        </p>
        <h1 className={styles.title}>
          Introducing <span className={styles.titleAccent}>{APP_NAME}</span>
        </h1>
        <p className={styles.lead}>
          Stop asking general-purpose chatbots for financial advice. Stop pasting hex codes into a model that has never seen the chain and praying for a hallucination-free answer.{" "}
          {APP_NAME} is an agentic AI for {CHAIN_NAME} intelligence — the apex predator of on-chain research. It doesn&apos;t guess: it plans, calls live on-chain tools, and answers with mathematically verified evidence.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/" className={shell.primaryCta}>
            Try {APP_NAME}
            <span aria-hidden="true" className={shell.arrow}>
              ↗
            </span>
          </Link>
          <Link href="/docs" className={shell.ghostCta}>
            Read the docs
          </Link>
        </div>
      </section>

      <article className={styles.article}>
        <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>
          Why standard AI is dead on arrival.
        </h2>
        <p>
          Let's be brutally honest: asking a general-purpose chatbot to audit a smart contract is a death sentence for your portfolio. They are trained on stale data from years ago. They have zero concept of what happened on the blockchain five minutes ago. They will confidently tell you a rug-pull is a "promising DeFi protocol" because they cannot actually read the live liquidity pools.
        </p>
        <p>
          We built <strong>{APP_NAME}</strong> to remove that limitation. We took a frontier reasoning model — the <strong>RobinX engine</strong> — and connected it to <strong>RobinX MCP</strong>—giving it direct, real-time read access to the Robinhood Chain.
        </p>
        <p>
          When you ask {APP_NAME} a question, it doesn't search its training weights. It writes a live execution plan, interrogates RPC nodes, scans deployer wallets, and calculates liquidity ratios in milliseconds. It then synthesizes that raw, chaotic blockchain data into beautiful, actionable UI widgets. This is not a chatbot. This is a terminal for on-chain warfare.
        </p>

        <h2 id="methods" className={styles.sectionTitle}>
          Methods
        </h2>
        <p>
          {APP_NAME} is an agentic loop, not a search box. Each request is planned by the
          model, executed against on-chain tools, and returned as a typed response the
          interface knows how to render. When a tool fails or credentials are missing, the
          system says it cannot answer instead of fabricating data.
          <sup className={styles.fnRef}>
            <a href="#fn-1" id="fnref-1" aria-label="Footnote 1">
              1
            </a>
          </sup>
        </p>

        <div className={styles.steps} role="list">
          {methodSteps.map((step) => (
            <div className={styles.step} role="listitem" key={step.number}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>

        <p>
          The interface treats every reply as a contract. Structured kinds —{" "}
          <code className={styles.inlineCode}>rugcheck</code>,{" "}
          <code className={styles.inlineCode}>trending</code>,{" "}
          <code className={styles.inlineCode}>sentiment</code>,{" "}
          <code className={styles.inlineCode}>wallet</code> — render as purpose-built widgets,
          and malformed responses are validated and rejected before they can break the UI.
          The same contract lets you point the interface at your own backend.
        </p>

        <h2 id="roadmap" className={styles.sectionTitle}>
          What you&apos;ll be able to do
        </h2>
        <p>
          Here is the whole arc — every one of these written as the sentence you&apos;d
          actually type. Some of it works today. Some of it is us telling you what we want
          to build, and asking whether you want it too. We label every capability honestly:{" "}
          <strong>Live</strong> is real right now,{" "}
          <strong>Building</strong> is half-wired,{" "}
          <strong>Planned</strong> gets built if enough of you push for it, and{" "}
          <strong>Research</strong> needs on-chain primitives that don&apos;t exist yet. No
          feature is dressed up as further along than it is — because the fastest way to kill
          a promise is to fake it.
        </p>
        <Roadmap />
        <p>
          The line between <strong>Planned</strong> and shipped is you. Bring the enthusiasm —
          hammer it, tell us where it&apos;s wrong, tell us which of these you&apos;d actually
          live in — and we build the ones you pull hardest on. That&apos;s not a growth-hack
          line. It&apos;s literally how the next commit gets prioritised.
        </p>

        <h2 id="limitations" className={styles.sectionTitle}>
          Limitations
        </h2>
        <ul className={styles.limitations}>
          {limitations.map((item, i) => (
            <li key={i}>
              {item.text}
              {item.footnote ? (
                <sup className={styles.fnRef}>
                  <a href={`#fn-${item.footnote}`} aria-label={`Footnote ${item.footnote}`}>
                    {item.footnote}
                  </a>
                </sup>
              ) : null}
            </li>
          ))}
        </ul>

        <h2 id="availability" className={styles.sectionTitle}>
          Availability
        </h2>
        <p>
          {APP_NAME} is free to use during the research preview. Sign in with Google or a
          wallet signature, and install it as an app on desktop or mobile — it ships as a
          fully installable PWA with offline fallback. We are eager to hear where it is
          useful, where it is wrong, and what you want it to do next.
        </p>
        <p>
          The rug-check engine also ships without us in the path. It is on npm as{" "}
          <code className={styles.inlineCode}>bugglo</code>: one command, no account, no API
          key, no backend — it reads {CHAIN_NAME} straight from your own machine and prints
          the three checks it could not run alongside the ones it could.
        </p>
        <pre className={styles.installBlock}>
          <code>npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1</code>
        </pre>
        <p>
          For agents, <code className={styles.inlineCode}>bugglo-mcp</code> is the same engine
          as an MCP server — four lines in an <code className={styles.inlineCode}>mcp.json</code>{" "}
          and Claude Desktop, Cursor, or your own agent gets the tools directly. Both are MIT.{" "}
          <Link href="/docs/bugglo-cli">Read the CLI docs</Link>.
        </p>
        <div className={styles.ctaRowLeft}>
          <Link href="/" className={shell.primaryCta}>
            Try {APP_NAME}
            <span aria-hidden="true" className={shell.arrow}>
              ↗
            </span>
          </Link>
          <Link href="/docs/bugglo-cli" className={shell.ghostCta}>
            Bugglo CLI
          </Link>
        </div>

        <footer className={styles.footnotes}>
          <h2 className={styles.footnotesTitle}>Footnotes</h2>
          <ol>
            <li id="fn-1">
              Tool calls, allowed tool lists, and per-call spend caps for paid x402 tools are
              configured server-side and never exposed to the browser.{" "}
              <a href="#fnref-1" aria-label="Back to reference 1">
                ↩
              </a>
            </li>
          </ol>
        </footer>
      </article>
    </main>
  );
}
