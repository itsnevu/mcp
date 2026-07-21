import { APP_NAME, CHAIN_NAME } from "./chatContract";

/* Single source of truth for the blog. The landing-page carousel, the /blog index,
   each article route, its <Article> JSON-LD, its Open Graph image, and the sitemap
   are all generated from this one array — so a new post is added in exactly one
   place and can never drift between the crawler's copy and the reader's.

   `body` is HTML because it carries inline <strong>/<code>/<a>/<ul>, and the same
   string is what a visitor reads and what the Article structured data describes.
   Keep it to the small tag set the CSS in blog.module.css styles. */

export const ARTICLES = [
  {
    slug: "pre-trade-simulation-trader-confidence",
    title:
      "The invisible power of security: how pre-trade simulation shapes trader confidence",
    /* The card title on the landing page keeps its lowercase house style; the
       document <h1>, <title>, and social cards use the sentence-case version above. */
    cardTitle:
      "the invisible power of security: how pre-trade simulation shapes trader confidence",
    dek: `The trades you never make are the ones that decide whether you are still here next year. Pre-trade simulation is how ${APP_NAME} turns a blind click into an informed one — and why the confidence it produces is the quiet kind that compounds.`,
    description: `Pre-trade simulation lets you see what a token contract will actually do to your wallet before you sign. Here is how ${APP_NAME} models the transaction on ${CHAIN_NAME}, what honeypots and hidden sell taxes look like when you catch them early, and why the security you never see is the security that matters most.`,
    readTime: "6 minutes",
    author: "Bugglo Research Group",
    date: "2026-07-18",
    keywords: [
      "pre-trade simulation",
      "transaction simulation",
      "honeypot detection",
      "sell tax detection",
      "rug check",
      "trader confidence",
      `${APP_NAME} security`,
      `${CHAIN_NAME} token safety`,
      "on-chain risk analysis",
      "simulate transaction before signing",
    ],
    sections: [
      {
        id: "the-cost-of-the-unknown",
        heading: "The trade you don't take",
        body: [
          `<p>Every trader remembers the token that doubled. Almost none remember the token they almost bought that turned out to be a honeypot — because nothing happened. There was no loss to post, no screenshot to share, no story to tell. The avoided disaster leaves no trace, and that is exactly why it is undervalued.</p>`,
          `<p>Security works the same way. When it is doing its job, you feel nothing. The strongest protection in trading is not the alert that fires; it is the position you never opened because something you could not have known was surfaced before you signed. This is the invisible power of security, and <strong>pre-trade simulation</strong> is the mechanism that makes it visible just long enough to act on.</p>`,
        ],
      },
      {
        id: "what-simulation-is",
        heading: "What pre-trade simulation actually does",
        body: [
          `<p>A pre-trade simulation answers one deceptively simple question: <em>if I signed this transaction right now, what would happen?</em> Instead of broadcasting the trade and finding out with real funds, ${APP_NAME} models the execution against live ${CHAIN_NAME} state — the same contract code, the same liquidity, the same balances — and reads back the result without ever spending gas or committing capital.</p>`,
          `<p>That single dry run exposes the things a token's marketing will never tell you:</p>`,
          `<ul>
            <li><strong>Can you sell?</strong> A honeypot lets you buy and then reverts on the way out. Simulation catches the revert before it costs you anything.</li>
            <li><strong>What is the real tax?</strong> A contract can advertise a 3% fee and enforce 40% in code. Simulation measures what actually leaves your wallet, not what the docs claim.</li>
            <li><strong>Who can change the rules?</strong> Ownership, upgradeable proxies, pausable transfers, and blacklists all mean the contract you tested can become a different contract after you buy.</li>
            <li><strong>Where does the value go?</strong> Simulation shows the net token and balance changes for your address — the ground truth beneath every promise on the token's page.</li>
          </ul>`,
        ],
      },
      {
        id: "how-bugglo-does-it",
        heading: `How ${APP_NAME} models the trade`,
        body: [
          `<p>${APP_NAME} is an agentic AI: you state an outcome, and the agent plans the steps. Ask it whether a token is safe to buy and it does not answer from memory — it resolves the contract address, pulls the holder distribution and the deployer's history, inspects ownership and proxy state, and reads the live liquidity, then reasons over everything that came back.</p>`,
          `<p>Every one of those steps is a live tool call against ${CHAIN_NAME} through the <strong>RobinX Model Context Protocol</strong>, and the evidence is shown to you next to the conclusion. That is the difference between a verdict and a claim: you can see the ownership status, the proxy flag, and the liquidity figure the judgement was built on, and decide for yourself.</p>`,
          `<p>The same engine runs from a terminal with no account and no API key. One command reads the contract straight from your own machine:</p>`,
          `<p><code>npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1</code></p>`,
          `<p>It prints a full rug-check report — contract existence, ownership, upgradeable-proxy status, privileged powers, and DEX liquidity — and, just as importantly, the checks it <strong>could not</strong> run. A check that did not run is never reported as a check that passed.</p>`,
        ],
      },
      {
        id: "unknown-is-not-safe",
        heading: `Why "unknown" is the most honest word in a report`,
        body: [
          `<p>The failure mode that ruins traders is not a red flag they ignored — it is a green light that was never earned. A tool that cannot read a contract's tax logic and therefore stays silent has, in effect, told you the tax is fine. It is not; it is unmeasured.</p>`,
          `<p>${APP_NAME} draws that line on purpose. When a signal cannot be verified, it is reported as <strong>unknown</strong>, never folded into a pass. Confidence built on an honest "we could not check this" is durable. Confidence built on silence is the kind that survives right up until the moment it doesn't.</p>`,
        ],
      },
      {
        id: "confidence-that-compounds",
        heading: "The confidence that compounds",
        body: [
          `<p>Traders talk about edge as if it were only about finding winners. But the arithmetic of survival is unforgiving: a single honeypot or a 90% hidden sell tax can erase a month of good calls. Avoiding the catastrophic downside is not a defensive footnote to a strategy — it is the strategy's precondition.</p>`,
          `<p>This is why the security you never see matters most. Pre-trade simulation does its work in the seconds before you sign, surfaces what you could not have known, and then disappears. The position you didn't take writes no story. But the account that is still compounding a year later was built, quietly, out of exactly those non-events.</p>`,
          `<p>Point ${APP_NAME} at the next contract before you sign it. The best trade is sometimes the one it talks you out of.</p>`,
        ],
      },
    ],
  },
  {
    slug: "history-of-honeypots-contract-vulnerability-vectors",
    title:
      "The history of honeypots: a complete breakdown of contract vulnerability vectors",
    cardTitle:
      "the history of honeypots: a complete breakdown of contract vulnerability vectors",
    dek: `Honeypots did not appear fully formed. They evolved — from crude balance traps to proxy contracts that rewrite themselves after you buy. This is the field guide to every major vector, and how to read a contract before it reads you.`,
    description: `A complete breakdown of smart-contract vulnerability vectors behind honeypots and rug pulls: transfer reverts, hidden sell taxes, blacklists, upgradeable proxies, mint functions, liquidity traps, and privileged owner powers — with how ${APP_NAME} detects each on ${CHAIN_NAME}.`,
    readTime: "7 minutes",
    author: "Bugglo Research Group",
    date: "2026-07-14",
    keywords: [
      "honeypot",
      "honeypot detection",
      "smart contract vulnerability",
      "rug pull vectors",
      "hidden sell tax",
      "blacklist function",
      "upgradeable proxy risk",
      "mint function backdoor",
      "liquidity trap",
      "renounced ownership",
      `${CHAIN_NAME} contract audit`,
      `${APP_NAME} rug check`,
    ],
    sections: [
      {
        id: "why-honeypots-exist",
        heading: "Why the trap works",
        body: [
          `<p>A honeypot is a smart contract engineered to look like an opportunity and function as a cage. You can buy. You can watch the chart. You simply cannot sell — or you can, and 90% of the proceeds vanish into a fee you were never shown. The trap works because a token's page is marketing, and marketing is not enforced by code. The code is.</p>`,
          `<p>Reading the code is the only defence, and the vectors below are, in rough order, how contract-level fraud evolved. Each is still in circulation, because each still catches people who trusted the interface instead of the bytecode.</p>`,
        ],
      },
      {
        id: "vector-transfer-revert",
        heading: "1. The transfer revert — the original honeypot",
        body: [
          `<p>The earliest and crudest trap: the contract's transfer or sell path contains a condition that reverts for everyone except the deployer. Buys succeed and pump the chart; every sell attempt fails. Your balance is real, your ability to realise it is zero.</p>`,
          `<p><strong>How to read it:</strong> a static read of the source can miss it, because the revert is often hidden behind an innocuous-looking modifier. Simulating a sell is decisive — the dry run reverts, and you have your answer for free. ${APP_NAME} models the sell path before you ever sign.</p>`,
        ],
      },
      {
        id: "vector-hidden-tax",
        heading: "2. The hidden sell tax",
        body: [
          `<p>More refined than an outright block: the token lets you sell but skims a punitive fee on the way out. A contract can advertise 3% and enforce 40%, or set a tax that only the owner can raise — to 99% — the moment there is enough liquidity to be worth draining.</p>`,
          `<p><strong>How to read it:</strong> never trust the stated fee. Measure the net balance change on a simulated buy and a simulated sell, and check whether a privileged function can change the fee after launch. A fixed, modest, immutable tax is fine. A mutable one is a lever pointed at your position.</p>`,
        ],
      },
      {
        id: "vector-blacklist",
        heading: "3. Blacklists and transfer gating",
        body: [
          `<p>A blacklist function lets the owner mark specific addresses as unable to transfer. Sold to some holders as an anti-bot measure, it doubles as a selective honeypot: let the crowd in, then blacklist the addresses that try to take profit. Its cousins are <code>pause()</code>, which freezes all transfers, and whitelist-gated trading that only the owner controls.</p>`,
          `<p><strong>How to read it:</strong> the presence of a blacklist, pause, or trading-toggle function is a standing risk regardless of whether it has been used yet. The question is never "has the owner abused this?" — it is "can they, at any time, without your consent?"</p>`,
        ],
      },
      {
        id: "vector-proxy",
        heading: "4. Upgradeable proxies — the contract that rewrites itself",
        body: [
          `<p>The most dangerous vector is also the most respectable-looking, because upgradeability is a legitimate engineering pattern. A proxy contract holds the state while delegating its logic to an implementation address the owner can swap. The token you audited on Monday can become entirely different code on Tuesday, with the same address and the same chart.</p>`,
          `<p><strong>How to read it:</strong> a clean audit of a proxy is only an audit of this instant. Detecting the upgradeable-proxy pattern is essential, and an unrenounced admin key on that proxy means every other check has an expiry date. ${APP_NAME} flags proxy status explicitly, because "safe now" and "safe" are not the same sentence.</p>`,
        ],
      },
      {
        id: "vector-mint",
        heading: "5. Mint functions and unbounded supply",
        body: [
          `<p>If the owner can mint new tokens, the supply you divided the market cap by is fiction. A hidden or owner-only <code>mint()</code> lets the deployer print an arbitrary amount and sell it into the liquidity you provided — a dilution rug that needs no revert and no blacklist, just arithmetic.</p>`,
          `<p><strong>How to read it:</strong> look for mint capability that is not renounced or hard-capped. "Renounced ownership" is only meaningful if the powers being renounced actually included minting — a deployer can renounce a decorative owner role while keeping a minter role on a separate access-control list.</p>`,
        ],
      },
      {
        id: "vector-liquidity",
        heading: "6. Liquidity traps",
        body: [
          `<p>Even with honest token code, the exit depends on the pool. If liquidity is unlocked, the deployer can pull it and leave holders with tokens that trade against nothing. Thin liquidity means a size that looks tradeable on the chart moves the price to zero on the way out. And liquidity concentrated in the deployer's own wallet is a rug with a countdown, not a market.</p>`,
          `<p><strong>How to read it:</strong> check whether liquidity is locked and for how long, how deep it is relative to the position you intend to take, and how it is distributed. Deep, locked, broadly-held liquidity is the floor under everything else.</p>`,
        ],
      },
      {
        id: "reading-before-it-reads-you",
        heading: "Reading the contract before it reads you",
        body: [
          `<p>No single check is sufficient, because these vectors combine. A contract can pass a rug check on ownership and liquidity while carrying a mutable tax behind an upgradeable proxy — three green lights and one fatal one. This is why ${APP_NAME} runs the full battery and, crucially, reports what it <strong>could not</strong> verify as unknown rather than as a pass.</p>`,
          `<p>You can run the same battery yourself in one command, with no account and no key:</p>`,
          `<p><code>npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1</code></p>`,
          `<p>It reports contract existence, ownership, upgradeable-proxy status, privileged powers, and DEX liquidity — the exact vectors above — straight from ${CHAIN_NAME}. For agents, <code>bugglo-mcp</code> exposes the same engine over the Model Context Protocol. The history of honeypots is a history of trusting the interface. The defence has always been the same: read the code, and treat every unread check as unread.</p>`,
        ],
      },
    ],
  },
];

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null;
}
