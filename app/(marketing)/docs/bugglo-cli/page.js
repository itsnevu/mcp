import Link from "next/link";
import { APP_NAME, CHAIN_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, techArticleLd, faqPageLd } from "@/lib/seo";
import styles from "../docs.module.css";

const TITLE = `Bugglo CLI — rug-check ${CHAIN_NAME} from your terminal, with no account`;
const DESCRIPTION = `bugglo is a command-line rug checker and library for ${CHAIN_NAME} (chain 4663). It reads the chain directly over a public RPC — no API key, no account, no backend — and reports UNKNOWN as a first-class result, because a check that did not run is never a check that passed. bugglo-mcp is the same engine as an MCP server for agents.`;

export const metadata = pageMetadata({
  /* The head term is "Bugglo CLI", but the people who need this are not searching a
     brand — they are searching the problem: "rug check from terminal", "npm rug
     check", "Robinhood Chain contract checker". The title carries the category. */
  title: "Bugglo CLI — terminal rug checks for Robinhood Chain",
  description: DESCRIPTION,
  path: "/docs/bugglo-cli",
  type: "article",
  keywords: [
    "bugglo CLI",
    "npx bugglo",
    "bugglo npm",
    "bugglo-mcp",
    "rug check CLI",
    "rug check command line",
    "terminal rug check",
    "token safety CLI",
    `${CHAIN_NAME} CLI`,
    `${CHAIN_NAME} rug check`,
    "chain 4663",
    "honeypot check CLI",
    "MCP server rug check",
    "Claude Desktop rug check",
    "smart contract checker npm",
  ],
});

/* Every command the published binary actually accepts. This table mirrors the arg
   parser in packages/bugglo/cli.js — if the two drift, the docs are teaching people
   an invocation that exits 2. */
const commands = [
  { cmd: "bugglo <address>", out: "Full rug-check report. The default, and the one you want." },
  { cmd: "bugglo rug <address>", out: "The same thing, named explicitly." },
  { cmd: "bugglo info <address>", out: "ERC-20 metadata, bytecode size, and the per-field errors behind any gap." },
  { cmd: "bugglo ownership <address>", out: "renounced, owned, or no-owner-fn — three answers, never collapsed into two." },
  { cmd: "bugglo proxy <address>", out: "EIP-1967 implementation slot. If it is a proxy, today's bytecode is not a promise about tomorrow's." },
  { cmd: "bugglo powers <address>", out: "Privileged selectors present in the deployed bytecode — mint, pause, blacklist and their relatives." },
  { cmd: "bugglo market <address>", out: "DexScreener liquidity, FDV, volume, buy/sell counts, pool age, and the ratios that matter." },
  { cmd: "bugglo limits", out: "What this package cannot do. Run it before you tell anyone a token looks safe." },
];

/* The seven tools bugglo-mcp exposes. Mirrors packages/bugglo-mcp/server.js. */
const mcpTools = [
  {
    name: "bugglo_rug_check",
    line: "Is this safe?",
    desc: "The full disclosure — every check below in one report, with a verdict and, attached to it, the list of what could not be checked.",
  },
  {
    name: "bugglo_token_info",
    line: "What is this, even?",
    desc: "Name, symbol, decimals, supply, bytecode size. Says plainly when an address is a wallet rather than a token.",
  },
  {
    name: "bugglo_ownership",
    line: "Who still holds the keys?",
    desc: "Renounced, owned, or no owner() function at all. The third case is not the first case, and this never pretends otherwise.",
  },
  {
    name: "bugglo_proxy_status",
    line: "Can the code change under me?",
    desc: "EIP-1967 proxy detection. An upgradeable contract is not a rug, but auditing today's bytecode tells you nothing about tomorrow's.",
  },
  {
    name: "bugglo_powers_scan",
    line: "What is the deployer allowed to do?",
    desc: "Privileged functions found in bytecode. Disclosed, not judged — mintable is not a rug, and plenty of honest tokens are.",
  },
  {
    name: "bugglo_market",
    line: "Can I actually get out?",
    desc: "Liquidity, FDV, 24h volume, buy and sell counts, pool age. This is the one part that does not come from the chain — it comes from DexScreener, and it is exactly as good as they are.",
  },
  {
    name: "bugglo_limits",
    line: "What are you not telling me?",
    desc: "The checks that cannot run at all. An agent that calls this before rendering a verdict is an agent that will not lie to its user by omission.",
  },
];

/* The three checks that are always disclosed as unmeasured, and the honest reason
   for each. This list is the product. Delete it and bugglo becomes every other
   scanner that turns silence into a green tick. */
const unmeasured = [
  {
    check: "Holder concentration",
    why: "Needs an indexer. Reconstructing balances from every Transfer log is not viable at CLI latency against a public RPC, and no indexer covers this chain yet.",
  },
  {
    check: "Liquidity lock",
    why: "Needs a known locker registry. This chain has none — so from here, a locked pool and an unlocked one look identical.",
  },
  {
    check: "Honeypot sell simulation",
    why: "Needs a simulated sell from a real holder through the router. Bugglo does not run that read today. A passing market check is not proof you can exit.",
  },
];

const faqs = [
  {
    question: "What is the Bugglo CLI?",
    answer: `bugglo is a command-line tool and JavaScript library that reads ${CHAIN_NAME} (chain 4663) directly and reports whether a token contract shows red flags. Run it with npx bugglo <address>. It needs no API key, no account, and no backend — it talks to the public chain RPC from your own machine.`,
  },
  {
    question: "How is this different from using the Bugglo web app?",
    answer: `Same engine, different door. The chain-reading logic lives in one package, so the CLI, the library, the MCP server, and the ${APP_NAME} web app cannot drift apart in what they claim about a contract. The difference is what surrounds it: the web app adds an agent that plans across a fleet of tools, cross-examines sources, and does deployer forensics. The CLI does one thing, offline from all of that, in about a second, with nothing to sign up for.`,
  },
  {
    question: "Does it need an API key or an account?",
    answer: "No. There is nothing to sign up for and nothing to bill. It reads the public Robinhood Chain RPC and DexScreener's public API, and it sends no telemetry — nothing is reported anywhere about what you looked up.",
  },
  {
    question: "Why does it say UNKNOWN instead of just passing the token?",
    answer: "Because a check that did not run is never a check that passed. Holder concentration, liquidity lock, and honeypot sell simulation cannot be measured from a bare RPC on this chain today, and rounding those unknowns up into a clean verdict is exactly the failure this package exists to prevent. There is no numeric risk score either — a score built from four measured signals and three unknowns launders ignorance into confidence.",
  },
  {
    question: "Can my own AI agent call it?",
    answer: "Yes — that is what bugglo-mcp is. Add it to Claude Desktop, Claude Code, Cursor, Windsurf, or any MCP client with a four-line config, and the agent gets seven tools against chain 4663. It is only an adapter: the chain logic stays in bugglo, so the answers cannot disagree with the CLI's.",
  },
  {
    question: "Is it safe to run against a token I do not trust?",
    answer: "It only reads. bugglo has no wallet, holds no key, signs nothing, and sends no transaction — there is no code path in it that can move funds. The worst a hostile contract can do to it is return data it refuses to interpret.",
  },
  {
    question: "I'm in Indonesia and it says CANNOT CHECK. Do I need a VPN?",
    answer: `No. Some Indonesian ISPs block the robinhood.com domain through the government Trust Positif DNS filter, so a lookup of rpc.mainnet.chain.robinhood.com returns the filter's server instead of the chain. bugglo v0.2.0+ handles this automatically: when the direct connection fails it re-resolves the host over DNS-over-HTTPS (which the ISP resolver cannot poison) and connects straight to the real IP, with TLS certificate validation still pinned to the true hostname. No VPN, no DNS change, no --rpc flag. Make sure you're on the latest version (npx bugglo@latest). Only if a network also blocks the DoH resolvers do the manual fallbacks apply: switch your DNS to 1.1.1.1 or 8.8.8.8, pass your own endpoint with --rpc, or use a VPN.`,
  },
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

export default function BuggloCliPage() {
  return (
    <main>
      <JsonLd
        data={[
          techArticleLd({
            title: TITLE,
            description: DESCRIPTION,
            path: "/docs/bugglo-cli",
            sections: [
              "What the CLI is",
              "Install and run",
              "Commands",
              "Reading the report",
              "What it will not fake",
              "Use it from an agent",
              "Library API",
            ],
          }),
          faqPageLd(faqs, "/docs/bugglo-cli"),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "Bugglo CLI", path: "/docs/bugglo-cli" },
          ]),
        ]}
      />

      <header className={styles.hero}>
        <div className={styles.kicker}>The terminal</div>
        <h1 className={styles.heroTitle}>Bugglo CLI</h1>
        <p className={styles.heroLead}>
          The web app is an agent with ten tools and an opinion. This is the opposite bet: one
          command, no account, no key, no backend, no us. It reads {CHAIN_NAME} straight from the
          chain and tells you what it found — and, in the same breath, what it could not check.
          Same engine as {APP_NAME}, stripped to the thing you can run in a second while a launch is
          still live.
        </p>

        <Code label="shell">{`npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1`}</Code>

        <div className={styles.modes}>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotLive} />0 accounts
            </div>
            <small className={styles.modeNote}>
              No key, no signup, no backend in the path. It talks to the chain, not to us.
            </small>
          </div>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotReady} />1 dependency
            </div>
            <small className={styles.modeNote}>
              viem, and nothing else. The cold start of <code className={styles.inline}>npx</code> is
              paid by a stranger, in silence, before they see anything.
            </small>
          </div>
          <div className={styles.mode}>
            <div className={styles.modeName}>
              <span aria-hidden="true" className={styles.dotNeutral} />3 unknowns
            </div>
            <small className={styles.modeNote}>
              Printed on every report, including the clean ones. They are the point.
            </small>
          </div>
        </div>
      </header>

      <section className={styles.section} id="what">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The idea</div>
          <h2 className={styles.sectionTitle}>Why a general-purpose scanner lies about this chain</h2>
        </div>
        <p className={styles.lead}>
          Point a general-purpose token checker at a {CHAIN_NAME} contract and it will tell you —
          truthfully, and uselessly — that no contract exists at that address. It is not lying. It
          is looking at Ethereum.
        </p>
        <p className={styles.lead}>
          You cannot tell that answer apart from a real finding, and neither can a language model.
          So a live token with bytecode, supply, and a liquidity pool gets reported as a phantom, and
          the tool sounds confident while it does it. That is not a hypothetical failure mode. It is
          the specific bug this package was written to kill.
        </p>
        <p className={styles.lead}>
          <strong>
            <code className={styles.inline}>bugglo</code> talks to chain 4663 and nothing else.
          </strong>{" "}
          It checks at startup that the RPC it reached really is {CHAIN_NAME}, and if it is not —
          wrong endpoint, unreachable, intercepted by an ISP — it says <em>that</em>, loudly, instead
          of answering about the wrong chain.
        </p>
      </section>

      <section className={styles.section} id="quickstart">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Getting started</div>
          <h2 className={styles.sectionTitle}>One command, no setup</h2>
          <p className={styles.lead}>
            Node 18 or newer. Nothing else. There is no second step, and no configuration file to
            find.
          </p>
        </div>

        <Code label="shell — the whole quickstart">{`# Full rug check
npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1

# Machine-readable, for scripts and CI
npx bugglo --json 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1

# Your own RPC, when the public one is rate-limited or blocked
npx bugglo --rpc https://your-robinhood-chain-rpc.example 0x2103…

# Several endpoints — the first healthy chain-4663 one wins
npx bugglo --rpc-list https://rpc.one,https://rpc.two 0x2103…`}</Code>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          The public {CHAIN_NAME} RPC is free and convenient, and it is also a single point of
          failure: public RPCs get rate-limited, blocked by some ISPs, and are simply unreachable
          from some networks. For bots, CI, desks, and anything public-facing, point it at a
          dedicated endpoint.
        </p>

        <Code label="environment — every variable, all optional">{`ROBINX_RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY
BUGGLO_RPC_URLS=https://rpc.one,https://rpc.two   # comma-separated fallbacks
CHAIN_RPC_TIMEOUT_MS=10000
CHAIN_DEX_TIMEOUT_MS=8000`}</Code>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          If every chain read fails, bugglo reports{" "}
          <code className={styles.inline}>CANNOT CHECK</code> /{" "}
          <code className={styles.inline}>UNKNOWN</code>. It does not turn an outage into a clean
          verdict — which, on the day the RPC is down and you are in a hurry, is the only behaviour
          worth anything.
        </p>

        <div className={styles.card} style={{ marginTop: 18 }} id="blocked">
          <h3>Blocked networks (Indonesia and elsewhere) are handled automatically</h3>
          <p>
            {CHAIN_NAME}&apos;s RPC lives on a <code className={styles.inline}>robinhood.com</code>{" "}
            subdomain, and some ISPs block that domain wholesale — most notably Indonesian networks
            running the government <strong>Trust Positif</strong> DNS filter, which answers a lookup
            of <code className={styles.inline}>rpc.mainnet.chain.robinhood.com</code> with the
            filter&apos;s own server instead of the chain. The endpoint itself is not geo-blocked;
            only its <em>name</em> is poisoned.
          </p>
          <p style={{ marginTop: 12 }}>
            So <strong>bugglo v0.2.0+ routes around it on its own.</strong> When a direct connection
            fails, it re-resolves the host over DNS-over-HTTPS — which the ISP&apos;s resolver cannot
            poison — and connects straight to the real IP, keeping TLS SNI and certificate validation
            pinned to the true hostname. The same endpoint, reached around the block. No VPN, no DNS
            change, no <code className={styles.inline}>--rpc</code> flag, no API key. If it still can
            confirm chain 4663, it prints a normal report; if it genuinely cannot, it says{" "}
            <code className={styles.inline}>CANNOT CHECK</code> and never guesses.
          </p>
          <p style={{ marginTop: 12 }}>
            The fallbacks below only matter on the rare network that blocks the DoH resolvers too, or
            if you are pinned to an older build:
          </p>
          <ol style={{ margin: "12px 0 0", paddingLeft: 20, lineHeight: 1.6 }}>
            <li>
              <strong>Switch your DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8).</strong> A
              resolver outside your ISP sidesteps a name-level block.
            </li>
            <li>
              <strong>Point bugglo at your own RPC</strong> on a domain that is not blocked:
            </li>
          </ol>
          <Code label="shell — your own endpoint, if you ever need it">{`npx bugglo --rpc https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY 0x2103…

# or set it once for the session
export ROBINX_RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY
npx bugglo 0x2103…`}</Code>
          <p style={{ marginTop: 12 }}>
            <strong>3. Use a VPN</strong> — the heaviest hammer, needed only if a deeper block
            survives everything above.
          </p>
        </div>
      </section>

      <section className={styles.section} id="commands">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The surface</div>
          <h2 className={styles.sectionTitle}>Eight commands</h2>
          <p className={styles.lead}>
            The first one is the one you will use. The rest exist so you can ask a single question
            without reading a whole report — and so a script can.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Command</th>
                <th>What it prints</th>
              </tr>
            </thead>
            <tbody>
              {commands.map((row) => (
                <tr key={row.cmd}>
                  <td>
                    <code className={styles.toolName}>{row.cmd}</code>
                  </td>
                  <td>{row.out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Code label="options">{`--json                 Print JSON where supported
--full                 Print the full address in the report
--rpc <url>            Override the Robinhood Chain RPC
--rpc-list <urls>      Comma-separated fallbacks; first healthy chain-4663 endpoint wins
--timeout <ms>         Chain RPC timeout
--dex-timeout <ms>     DexScreener timeout
--no-color             Disable ANSI colour
--help                 Show help
--version              Show version`}</Code>

        <div className={styles.tableWrap} style={{ marginTop: 18 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Exit code</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code className={styles.toolName}>0</code>
                </td>
                <td>
                  The command completed. <strong>The result may still contain WARN or UNKNOWN</strong>{" "}
                  — zero means it ran, not that the token is fine. Read it.
                </td>
              </tr>
              <tr>
                <td>
                  <code className={styles.toolName}>1</code>
                </td>
                <td>The check could not complete, or the RPC proved wrong or unusable.</td>
              </tr>
              <tr>
                <td>
                  <code className={styles.toolName}>2</code>
                </td>
                <td>Bad usage — malformed address, unknown option.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} id="verdict">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The output</div>
          <h2 className={styles.sectionTitle}>The verdict is deliberately wordy</h2>
        </div>

        <Code label="npx bugglo 0x2103…9bf1">{`BUGGLO — rug check
Robinhood Chain (chain 4663)
0x2103...9bf1
Robin Hood (FOX), 18 decimals

VERDICT  NO RED FLAGS IN WHAT I COULD CHECK

  UNKNOWN Ownership unclear
          There is no standard owner() function. That does NOT mean ownership is
          renounced — the contract may use roles or an embedded admin that I cannot see.
  PASS    Contract exists
          4,830 bytes of bytecode on Robinhood Chain (chain 4663).
  PASS    Sells are going through
          People are getting out, so it is not a hard honeypot.

NOT CHECKED — these are not passes
  holder concentration
  liquidity lock
  honeypot / sell simulation`}</Code>

        <div className={styles.grid} style={{ marginTop: 18 }}>
          <div className={styles.card}>
            <h3>UNKNOWN is not PASS</h3>
            <p>
              A check that could not run is never a check that succeeded. There is no code path in
              this package that turns a failed read into a clean result — not when the RPC times
              out, not when the contract is unusual, not when the answer would be more convenient.
            </p>
          </div>
          <div className={styles.card}>
            <h3>No numeric risk score</h3>
            <p>
              A score computed from four measured signals and three unknowns is a number that
              launders ignorance into false confidence, and people size positions off it. So there
              isn&apos;t one.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Powers are disclosed, not judged</h3>
            <p>
              Mintable is not a rug. Pausable is not a rug. Plenty of honest tokens are both. This
              tells you which powers exist in the bytecode and who still holds the keys. What you
              are comfortable with is yours to decide, and it is not the tool&apos;s job to decide
              it for you.
            </p>
          </div>
          <div className={styles.card}>
            <h3>&ldquo;No red flags in what I could check&rdquo;</h3>
            <p>
              That sentence is long on purpose. It is the honest ceiling of what a bare RPC can
              prove, and rounding it up to <em>safe</em> is the entire failure mode this exists to
              prevent.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="limits">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>The honest part</div>
          <h2 className={styles.sectionTitle}>Three things it will never fake</h2>
          <p className={styles.lead}>
            These are printed as unmeasured on every report — including the clean ones. Run{" "}
            <code className={styles.inline}>bugglo limits</code> to get them on their own.
          </p>
        </div>

        <div className={styles.toolGroup}>
          {unmeasured.map((item) => (
            <div className={styles.tool} key={item.check}>
              <code className={styles.toolName}>{item.check}</code>
              <p className={styles.toolDesc}>
                <strong className={styles.toolLine}>Not measured.</strong> {item.why}
              </p>
            </div>
          ))}
        </div>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          Two hosts, and no others — named here because a tool that will not name its own
          dependencies has no business lecturing you about disclosure.{" "}
          <code className={styles.inline}>rpc.mainnet.chain.robinhood.com</code> serves everything
          read from the chain itself: bytecode, <code className={styles.inline}>owner()</code>, the
          EIP-1967 slot, ERC-20 metadata. <code className={styles.inline}>api.dexscreener.com</code>{" "}
          serves market data only, and it is a third party. If the RPC is down, every contract check
          reports UNKNOWN. If DexScreener is down, the market check reports UNKNOWN and the contract
          checks still run.
        </p>
      </section>

      <section className={styles.section} id="mcp">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>For agents</div>
          <h2 className={styles.sectionTitle}>The same engine, as an MCP server</h2>
          <p className={styles.lead}>
            <code className={styles.inline}>bugglo-mcp</code> hands the seven tools below to Claude
            Desktop, Claude Code, Cursor, Windsurf, or whatever you are building. It is only an
            adapter — the chain logic stays in{" "}
            <code className={styles.inline}>bugglo</code>, so the CLI, the library, and your agent
            cannot drift apart about what a contract is.
          </p>
        </div>

        <Code label="mcp.json — the whole config">{`{
  "mcpServers": {
    "bugglo": {
      "command": "npx",
      "args": ["-y", "bugglo-mcp"]
    }
  }
}`}</Code>

        <div className={styles.toolGroup} style={{ marginTop: 18 }}>
          {mcpTools.map((tool) => (
            <div className={styles.tool} key={tool.name}>
              <code className={styles.toolName}>{tool.name}</code>
              <p className={styles.toolDesc}>
                <strong className={styles.toolLine}>{tool.line}</strong> {tool.desc}
              </p>
            </div>
          ))}
        </div>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          It is <strong>not</strong> the only MCP server covering {CHAIN_NAME}.{" "}
          <Link href="/docs/robinx-mcp" className={styles.link}>
            RobinX MCP
          </Link>{" "}
          answers questions this one cannot — deployer reputation and insider-distribution history,
          both of which need an indexer behind them. If you want a deployer&apos;s rap sheet, use
          that; its stronger tools are paid and reached through a hosted API. This one is the other
          trade: it reads the chain directly, so it needs nothing from anybody. Different tools. Run
          both.
        </p>
      </section>

      <section className={styles.section} id="library">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>For code</div>
          <h2 className={styles.sectionTitle}>Import it instead</h2>
          <p className={styles.lead}>
            The same functions the CLI calls, with no CLI in the way. One dependency — viem — so it
            is safe to put in a bot or a build step.
          </p>
        </div>

        <Code label="library">{`import { rugCheck, ROBINHOOD_CHAIN_ID } from "bugglo";
import { renderRugCheck } from "bugglo/report";

const result = await rugCheck("0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1");
console.log(renderRugCheck(result));`}</Code>

        <Code label="every export">{`import {
  ROBINHOOD_CHAIN_ID,
  RPC_URL,
  UNMEASURABLE,
  rugCheck,
  getContractCode,
  getTokenMetadata,
  getOwnership,
  getProxyStatus,
  getMarket,
  scanPowers,
} from "bugglo";

import { renderRugCheck, renderOneLine } from "bugglo/report";`}</Code>

        <p className={styles.lead} style={{ marginTop: 18 }}>
          <code className={styles.inline}>UNMEASURABLE</code> is exported on purpose. If you are
          building a UI on top of this, the list of what could not be checked is not an error path
          to swallow — it is a thing your users have to see.
        </p>
      </section>

      <section className={styles.section} id="cli-faq">
        <div className={styles.sectionHead}>
          <div className={styles.eyebrow}>Questions</div>
          <h2 className={styles.sectionTitle}>The seven people actually ask</h2>
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

      <section className={styles.section} id="cli-next">
        <div className={styles.callout}>
          <div>
            <h2>Run it on something with money on the line</h2>
            <p>
              Both packages are MIT and published on npm —{" "}
              <code className={styles.inline}>bugglo</code> and{" "}
              <code className={styles.inline}>bugglo-mcp</code>. The agent that plans across a whole
              fleet of tools, rather than reading one chain very carefully, is{" "}
              <Link href="/docs/robinx-mcp" className={styles.link}>
                RobinX MCP
              </Link>
              , and the app built on it is one click away.
            </p>
          </div>
          <Link href="/app" className={styles.cta}>
            Try {APP_NAME}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
