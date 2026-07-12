import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import SampleExplorer from "./SampleExplorer";
import shell from "../marketing.module.css";
import styles from "./intro.module.css";

export const metadata = {
  title: `Introducing ${APP_NAME}`,
  description:
    "HoodScope is an agentic AI for Robinhood Chain intelligence — conversational rug checks, deployer reputation, wallet analysis, and market moves, grounded in live on-chain data.",
};

const methodSteps = [
  {
    number: "01",
    title: "Natural Language Processing Engine",
    body: "Unlike traditional block explorers that require precise hex addresses and complex filter parameters, HoodScope accepts queries exactly the way you would ask a human analyst. Whether you paste a smart contract address, mention a ticker symbol, or describe a broad market phenomenon, the NLP engine parses your intent, extracts relevant on-chain entities, and determines the optimal analytical approach. Slash commands like /rugcheck and /trending exist for power users who want to bypass the NLP routing.",
  },
  {
    number: "02",
    title: "Autonomous Agentic Planning",
    body: "Once your intent is understood, Claude acts as an autonomous agent. It breaks your request down into a multi-step execution plan. If you ask for a 'deep dive on the deployer of Token X', the agent first plans to resolve the token address, then query the deployer address, and finally scan the deployer's historical transaction graph across the Robinhood Chain. This happens in milliseconds.",
  },
  {
    number: "03",
    title: "Live On-Chain Data via RobinX MCP",
    body: "The agent executes its plan by calling specialized tools via the Model Context Protocol (MCP). These aren't generic web searches. The agent is directly probing live RPC nodes, smart contract states, liquidity pools, and historical indexers to fetch deployer reputation scores, token holder distributions, and live price feeds. The data is pulled straight from the blockchain.",
  },
  {
    number: "04",
    title: "Structured, Actionable Intelligence",
    body: "Raw blockchain data is notoriously difficult to read. Instead of returning a wall of JSON or a dense paragraph of text, HoodScope synthesizes the data into highly structured, purpose-built UI widgets. Responses come back as interactive risk gauges, trending tables with sparkline charts, sentiment bars, and comprehensive wallet statistic tiles. Every single claim is backed by the on-chain data fetched in step three.",
  },
];

const limitations = [
  {
    text: "Probabilistic Signals: HoodScope can produce plausible-sounding but incorrect or incomplete analysis. On-chain signals are inherently probabilistic. A 'clean' rug check report is not a guarantee of safety (as malicious code can be heavily obfuscated), and a flagged report is not absolute proof of fraud. Always conduct your own secondary research.",
  },
  {
    text: "Demo Data Mode: When running without an Anthropic API Key or RobinX credentials, the system gracefully degrades to 'Demo Mode'. In this mode, figures carry a DEMO DATA badge and are purely illustrative placeholders—they do not reflect live market data or actual blockchain state.",
    footnote: 1,
  },
  {
    text: "Paid Tool Access: Advanced RobinX MCP tools (such as deep deployer forensic scans) are paid via x402/USDC microtransactions. Without a funded wallet key configured in the backend environment, those specific tools will return a price probe error instead of data, and the agent will notify you of the restriction.",
    footnote: 2,
  },
  {
    text: "Rate Limiting & Quotas: To ensure system stability and fair usage during the research preview, conversations are strictly rate-limited to 30 requests per minute per IP address. Additionally, user messages are capped at 2,000 characters to prevent context-window overflow.",
  },
  {
    text: "No Financial Advice: Nothing HoodScope produces constitutes financial, legal, or investment advice. It is strictly an analytical research tool. All trading decisions and their financial consequences remain entirely your responsibility.",
  },
  {
    text: "Latency: Complex queries requiring multiple sequential MCP tool calls (e.g., tracing funds through multiple wallets) may take up to 20 seconds to resolve. The UI will display a loading indicator while the agent processes the chain data.",
  }
];

export default function IntroPage() {
  return (
    <main>
      <section className={styles.hero}>
        <p className={styles.kicker}>
          <span>Product</span>
          <span aria-hidden="true" className={styles.kickerDot} />
          <time dateTime="2026-07-12">July 12, 2026</time>
        </p>
        <h1 className={styles.title}>
          Introducing <span className={styles.titleAccent}>{APP_NAME}</span>
        </h1>
        <p className={styles.lead}>
          Stop asking ChatGPT for financial advice. Stop pasting hex codes into vanilla Claude and praying for a hallucination-free answer. 
          {APP_NAME} is the apex predator of Robinhood Chain intelligence. It doesn't guess—it investigates with live on-chain tools and answers with absolute, mathematically verified evidence.
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
          Let's be brutally honest: asking a generic AI like ChatGPT or Claude to audit a smart contract is a death sentence for your portfolio. They are trained on stale data from years ago. They have zero concept of what happened on the blockchain five minutes ago. They will confidently tell you a rug-pull is a "promising DeFi protocol" because they cannot actually read the live liquidity pools.
        </p>
        <p>
          We built <strong>{APP_NAME}</strong> to obliterate that limitation. We took the world's most advanced reasoning engine (Claude 3.5 Sonnet) and weaponized it with <strong>RobinX MCP</strong>—giving it direct, unfettered, real-time read access to the Robinhood Chain.
        </p>
        <p>
          When you ask {APP_NAME} a question, it doesn't search its training weights. It writes a live execution plan, interrogates RPC nodes, scans deployer wallets, and calculates liquidity ratios in milliseconds. It then synthesizes that raw, chaotic blockchain data into beautiful, actionable UI widgets. This is not a chatbot. This is a terminal for on-chain warfare.
          <sup className={styles.fnRef}>
            <a href="#fn-1" id="fnref-1" aria-label="Footnote 1">
              1
            </a>
          </sup>
        </p>

        <h2 id="samples" className={styles.sectionTitle}>
          Samples
        </h2>
        <p>
          In the following samples, {APP_NAME} answers the kinds of questions traders actually
          ask: is this contract safe, who deployed it, what is moving today, and what does this
          wallet hold. Addresses shown are illustrative.
        </p>
        <SampleExplorer />

        <h2 id="methods" className={styles.sectionTitle}>
          Methods
        </h2>
        <p>
          {APP_NAME} is an agentic loop, not a search box. Each request is planned by the
          model, executed against on-chain tools, and returned as a typed response the
          interface knows how to render. When a tool fails or credentials are missing, the
          system degrades gracefully to demo mode instead of failing silently.
          <sup className={styles.fnRef}>
            <a href="#fn-2" id="fnref-2" aria-label="Footnote 2">
              2
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
          <code className={styles.inlineCode}>wallet</code> - render as purpose-built widgets,
          and malformed responses are validated and rejected before they can break the UI.
          The same contract lets you point the interface at your own backend.
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
          wallet signature, and install it as an app on desktop or mobile - it ships as a
          fully installable PWA with offline fallback. We are eager to hear where it is
          useful, where it is wrong, and what you want it to do next.
        </p>
        <div className={styles.ctaRowLeft}>
          <Link href="/" className={shell.primaryCta}>
            Try {APP_NAME}
            <span aria-hidden="true" className={shell.arrow}>
              ↗
            </span>
          </Link>
        </div>

        <footer className={styles.footnotes}>
          <h2 className={styles.footnotesTitle}>Footnotes</h2>
          <ol>
            <li id="fn-1">
              Demo mode requires no API keys and marks every figure with a DEMO DATA badge.
              Live mode activates automatically when an Anthropic API key is configured.{" "}
              <a href="#fnref-1" aria-label="Back to reference 1">
                ↩
              </a>
            </li>
            <li id="fn-2">
              Tool calls, allowed tool lists, and per-call spend caps for paid x402 tools are
              configured server-side and never exposed to the browser.{" "}
              <a href="#fnref-2" aria-label="Back to reference 2">
                ↩
              </a>
            </li>
          </ol>
        </footer>
      </article>
    </main>
  );
}
