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
    title: "Ask in plain language",
    body: "Type a question the way you would ask an analyst — paste a contract, name a ticker, or describe what you want to know. Slash commands like /rugcheck and /trending are there when you want them.",
  },
  {
    number: "02",
    title: "The agent calls on-chain tools",
    body: "Claude plans the request and queries RobinX MCP tools — deployer reputation, token stats, launch feeds, leaderboards, and verdicts — over the Model Context Protocol.",
  },
  {
    number: "03",
    title: "Grounded answers, rendered as widgets",
    body: "Responses come back as structured reports: risk gauges, trending tables with sparklines, sentiment bars, and wallet stat tiles — every claim tied to the data behind it.",
  },
];

const limitations = [
  {
    text: "HoodScope can produce plausible-sounding but incorrect or incomplete analysis. On-chain signals are probabilistic; a clean report is not a guarantee of safety, and a flagged one is not proof of fraud.",
  },
  {
    text: "In demo mode, figures carry a DEMO DATA badge and are illustrative placeholders — not live market data.",
    footnote: 1,
  },
  {
    text: "Some RobinX MCP tools are paid via x402/USDC. Without a funded wallet key, those tools return a price probe instead of data, and the agent will say so.",
    footnote: 2,
  },
  {
    text: "Conversations are rate-limited (30 requests per minute per IP) and messages are capped at 2,000 characters to keep the service responsive for everyone.",
  },
  {
    text: "Nothing HoodScope produces is financial advice. It is a research tool; decisions and their consequences remain yours.",
  },
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
          A conversational agent for Robinhood Chain intelligence. Ask about any token,
          contract, deployer, or wallet — {APP_NAME} investigates with live on-chain tools
          and answers with evidence, not vibes.
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
        <p>
          We built <strong>{APP_NAME}</strong>, an agent that interacts with Robinhood Chain
          in a conversational way. The dialogue format makes it possible to paste a contract
          address and get a structured risk report, follow up with questions about the
          deployer&rsquo;s history, challenge a verdict, and drill into the data behind every
          claim.
        </p>
        <p>
          {APP_NAME} pairs <strong>Claude</strong> with <strong>RobinX MCP</strong> — a set of
          live on-chain tools for Robinhood Chain — so answers are grounded in what the chain
          actually says: deployer reputation, launch history, holder distribution, liquidity,
          and market movement. When live credentials are not configured, the app runs in a
          clearly labeled demo mode so you can explore the full experience first.
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
          <code className={styles.inlineCode}>wallet</code> — render as purpose-built widgets,
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
          wallet signature, and install it as an app on desktop or mobile — it ships as a
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
