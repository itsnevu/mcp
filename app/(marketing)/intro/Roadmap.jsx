"use client";

import { useMemo, useState } from "react";
import styles from "./intro.module.css";

/**
 * Capability ladder.
 *
 * Every item is written as the sentence you would actually type into Bugglo.
 * `status` is load-bearing and must stay honest — it is the only thing telling a
 * reader whether they can do this today or whether we are asking them to want it:
 *
 *   live     → works right now, in production
 *   building → partially wired, not yet shipped
 *   planned  → designed, not started. Gets built if enough people ask.
 *   research → needs primitives that do not exist yet (usually on-chain)
 */
const HORIZONS = [
  { id: "live", label: "Live", blurb: "You can do this today." },
  { id: "building", label: "Building", blurb: "Half-wired. Landing soon." },
  { id: "planned", label: "Planned", blurb: "Designed. Built if you want it." },
  { id: "research", label: "Research", blurb: "Needs primitives that don't exist yet." },
];

const CAPABILITIES = [
  {
    status: "live",
    prompt: "Is 0x7f3a…c9d2 safe to ape?",
    title: "Rug-check anything with an address",
    body: "The agent checks the Robinhood Chain contract directly, reads ownership and proxy state, inspects privileged powers, checks DEX liquidity, and states exactly which checks are still unmeasured. A clean answer that hides unknowns is not clean.",
  },
  {
    status: "live",
    prompt: "Who deployed this, and what else have they shipped?",
    title: "Deployer forensics",
    body: "Tokens don't rug. People do. Bugglo walks the deployer's address backwards through every contract they've ever created and shows you the pattern before you're in it.",
  },
  {
    status: "live",
    prompt: "What's actually moving on Robinhood Chain right now?",
    title: "Trending, with the liquidity attached",
    body: "Volume without liquidity is a trap with a chart. You get both, side by side, so the trap is visible.",
  },
  {
    status: "live",
    prompt: "Is the hype on X matched by real on-chain volume?",
    title: "Social signal vs. chain truth",
    body: "The agent reads the timeline and the ledger in the same breath and reports whether attention is backed by liquidity and volume, or whether the conversation is running ahead of the chain.",
  },
  {
    status: "live",
    prompt: "Just… figure it out.",
    title: "Ten tools, zero tool-picking",
    body: "You never choose a data source. The agent plans its own route across Blockscout, DexScreener, whale-cluster analysis, and the raw RPC — and reroutes when one of them fails.",
  },
  {
    status: "building",
    prompt: "Do these holders look organic?",
    title: "Holder clustering by funding path",
    body: "The agent walks holder wallets backwards to the addresses that funded them, then reports clusters as clusters instead of pretending every wallet is an independent buyer.",
  },
  {
    status: "building",
    prompt: "Show me your work.",
    title: "Watch the agent think, live",
    body: "Every tool call streamed as it happens — what it queried, what came back, what it decided to do about it. An agent you can't audit is just a slot machine with better grammar.",
  },
  {
    status: "building",
    prompt: "What is vitalik.hood holding?",
    title: "Names instead of hex",
    body: ".hood domains resolve inline, so you can talk about wallets the way you actually think about them.",
  },
  {
    status: "building",
    prompt: "Where were we?",
    title: "Memory that survives the tab",
    body: "Threads sync across your devices, and the agent remembers what you told it you were tracking.",
  },
  {
    status: "planned",
    prompt: "Was this launch bundled?",
    title: "Bundler and sniper forensics",
    body: "Same-block buy bundles, wallets funded from a single source minutes before the pool opened, sniper clusters that ate the first 90 seconds — and the number underneath all of it: the real insider allocation hiding behind the words 'fair launch'. A chart can't lie to you about this. The first three blocks can't either.",
  },
  {
    status: "planned",
    prompt: "Did that volume actually happen?",
    title: "Wash-trade detection",
    body: "Circular transfers, self-crossing fills, and money that loops between the same six wallets without ever reaching a new one. Faked volume is the cheapest lie on any chain, and it's the one the leaderboard rewards.",
  },
  {
    status: "planned",
    prompt: "Launch a token with the supply, pool, lock, and ownership policy I specify.",
    title: "Deploy a token from one sentence",
    body: "The agent assembles the deploy, the pool, the lock, and the renounce into one reviewable bundle with verified source, shows you the simulation, and hands it to your wallet to sign. It never holds a key — it proposes, you sign. Launching honestly should not require trusting a launchpad with your contract.",
  },
  {
    status: "planned",
    prompt: "Quote this swap, but do not proceed if the impact is above my limit.",
    title: "Quote, simulate, then trade",
    body: "Research and execution in one loop instead of two tabs. The agent routes the swap, states the impact, dry-runs it against live chain state, and shows you exactly what leaves your wallet before anything is signed. The order never fires on its own.",
  },
  {
    status: "planned",
    prompt: "Watch this deployer. Wake me the second he launches again.",
    title: "Standing agents",
    body: "A prompt that keeps running after you close the laptop. The agent holds the watch, and pushes you the moment its condition trips. This is the difference between a chatbot and something that works for you.",
  },
  {
    status: "planned",
    prompt: "I'm about to sign this. What actually happens?",
    title: "Pre-flight simulation",
    body: "Paste the transaction before you sign it. Bugglo simulates it against live chain state and tells you exactly what leaves your wallet — catching approval drains and honeypot sells while it's still free to walk away.",
  },
  {
    status: "planned",
    prompt: "What am I still approved for?",
    title: "Approval hygiene",
    body: "Every outstanding allowance you've ever granted, ranked by how much it could cost you, with the dead ones revocable in one click. Most wallets get drained by a signature from eight months ago.",
  },
  {
    status: "planned",
    prompt: "Be honest about my bags.",
    title: "Portfolio X-ray",
    body: "Read-only. Connect a wallet and get the context your PnL screen will not show: shared deployers, shared funding paths, outstanding approvals, and positions that are more correlated than their tickers make them look.",
  },
  {
    status: "planned",
    prompt: "(from inside Claude Desktop, Cursor, or your own agent)",
    title: "Bugglo as an MCP server",
    body: "Flip it around. Point your own agent at Bugglo and call our tools directly — rug-check, deployer history, chain state — as primitives in whatever you're building. We're an MCP client today. Being the server is a one-way door worth opening.",
  },
  {
    status: "research",
    prompt: "Sell part of the position if my target hits. Exit if liquidity drops below my limit.",
    title: "Intents, not orders",
    body: "You state the outcome. It compiles to an on-chain intent that settles without you awake, without you trusting us to stay online, and without a centralised bot holding your keys.",
  },
  {
    status: "research",
    prompt: "You may trade, but only inside the spend limit I set.",
    title: "Execution behind a hard ceiling",
    body: "The honest problem with an agent that can spend money is that the worst case is your whole wallet. So the worst case has to be enforced somewhere the agent cannot argue with — a spend-cap vault, on-chain, where the limit is a number you set and the agent physically cannot exceed it. This is the one capability on this page that genuinely requires a contract we'd have to write and get audited. We won't ship it until that's true.",
  },
  {
    status: "research",
    prompt: "Buy the data you need to answer this.",
    title: "Agent pays agent",
    body: "x402/USDC micropayments, both directions: Bugglo buys the premium forensics it needs mid-thought, and sells its own verdicts as a paid tool to other agents. A machine economy where the unit of trade is a well-researched answer.",
  },
  {
    status: "research",
    prompt: "Put that verdict on-chain and stake on it.",
    title: "A reputation you can't delete",
    body: "Publish every rug-check call on-chain, timestamped, immutable. Be wrong in public. An analyst whose bad calls can be silently edited out has no track record at all — just a marketing page.",
  },
  {
    status: "research",
    prompt: "Have your agents argue about it.",
    title: "Swarm verdicts",
    body: "Several specialist agents reach their own conclusions and then fight. You see the disagreement itself, not a confident average laundered from three models that were unsure.",
  },
];

const STATUS_LABEL = {
  live: "Live",
  building: "Building",
  planned: "Planned",
  research: "Research",
};

export default function Roadmap() {
  const [active, setActive] = useState("all");

  const counts = useMemo(() => {
    return CAPABILITIES.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }, []);

  const shown = active === "all" ? CAPABILITIES : CAPABILITIES.filter((c) => c.status === active);

  return (
    <div className={styles.roadmap}>
      <div className={styles.roadmapFilters} role="tablist" aria-label="Filter capabilities by horizon">
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          className={active === "all" ? styles.roadmapFilterActive : styles.roadmapFilter}
          onClick={() => setActive("all")}
        >
          Everything
          <span className={styles.roadmapFilterCount}>{CAPABILITIES.length}</span>
        </button>
        {HORIZONS.map((h) => (
          <button
            key={h.id}
            type="button"
            role="tab"
            aria-selected={active === h.id}
            className={active === h.id ? styles.roadmapFilterActive : styles.roadmapFilter}
            onClick={() => setActive(h.id)}
          >
            <span aria-hidden="true" className={`${styles.roadmapDot} ${styles[`dot_${h.id}`]}`} />
            {h.label}
            <span className={styles.roadmapFilterCount}>{counts[h.id] || 0}</span>
          </button>
        ))}
      </div>

      {active !== "all" ? (
        <p className={styles.roadmapBlurb}>{HORIZONS.find((h) => h.id === active)?.blurb}</p>
      ) : null}

      <ul className={styles.roadmapList}>
        {shown.map((item) => (
          <li key={item.title} className={styles.roadmapItem}>
            <div className={styles.roadmapItemHead}>
              <p className={styles.roadmapPrompt}>
                <span aria-hidden="true" className={styles.roadmapCaret}>
                  &gt;
                </span>
                {item.prompt}
              </p>
              <span className={`${styles.roadmapStatus} ${styles[`status_${item.status}`]}`}>
                <span aria-hidden="true" className={`${styles.roadmapDot} ${styles[`dot_${item.status}`]}`} />
                {STATUS_LABEL[item.status]}
              </span>
            </div>
            <h3 className={styles.roadmapTitle}>{item.title}</h3>
            <p className={styles.roadmapBody}>{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
