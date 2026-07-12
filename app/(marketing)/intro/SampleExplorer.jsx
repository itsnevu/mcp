"use client";

import { useState } from "react";
import { APP_NAME } from "@/lib/chatContract";
import styles from "./intro.module.css";

const SAMPLES = [
  {
    label: "Rug check",
    turns: [
      {
        role: "user",
        text: "Rug check this contract: 0x7f3a…c9d2",
      },
      {
        role: "agent",
        text: `Here's what the chain says about 0x7f3a…c9d2:

Risk score: 34 / 100 — Caution
• Liquidity: locked for 90 days (verified)
• Mint authority: renounced
• Deployer: 6 prior launches, 1 flagged for a honeypot pattern
• Holders: top 10 wallets hold 41% of supply

The flagged prior launch and the concentrated top holders are the main concerns. Want me to pull the deployer's full history?`,
      },
      {
        role: "user",
        text: "Yes — anything suspicious in their history?",
      },
      {
        role: "agent",
        text: `Deployer 0x91b4…e07a has been active for 8 months. Of 6 launches, 4 traded normally, 1 was abandoned early, and 1 (Feb 2026) shows a honeypot signature — buys succeeded while sells reverted for 26 hours before liquidity was pulled. I'd treat anything from this deployer as high-scrutiny.`,
      },
    ],
  },
  {
    label: "Deployer reputation",
    turns: [
      {
        role: "user",
        text: "Who is behind deployer 0x2ce8…41f7? Can I trust their new token?",
      },
      {
        role: "agent",
        text: `Reputation summary for 0x2ce8…41f7:

Reputation: 78 / 100 — Established
• 12 launches over 14 months, none flagged
• Median liquidity lock: 180 days
• Contracts verified on 11 of 12 launches
• Funding source: aged wallet, no mixer inflows

This profile is consistent with a serial builder rather than a serial rugger. That said, reputation lowers risk — it doesn't remove it. I'd still check the new token's own liquidity and holder spread before sizing in.`,
      },
    ],
  },
  {
    label: "Market moves",
    turns: [
      {
        role: "user",
        text: "What's moving on Robinhood Chain today?",
      },
      {
        role: "agent",
        text: `Three tokens stand out in the last 24 hours:

1. HOOD-X — +42%, mentions up 6× — new DEX listing driving volume
2. SCOPE — +18%, steady accumulation from 3 whale wallets
3. LMN — −27%, deployer wallet moved 15% of supply to an exchange

The LMN move is the one to watch: supply moving to an exchange from the deployer often precedes selling. Want a sentiment breakdown on any of these?`,
      },
    ],
  },
  {
    label: "Wallet analysis",
    turns: [
      {
        role: "user",
        text: "Analyze wallet 0x5dd1…8b3c before I copy-trade it.",
      },
      {
        role: "agent",
        text: `Profile for 0x5dd1…8b3c:

• Age: 11 months, 1,204 transactions
• Realized PnL (90d): +$48,200 across 61 positions
• Win rate: 64%, median hold time 3.2 days
• Flags: none — no mixer inflows, no honeypot interactions

The performance is real but concentrated: 70% of PnL came from 4 early entries. Copy-trading the tail of that strategy won't reproduce those results. I can alert you when this wallet opens a new position instead.`,
      },
    ],
  },
];

export default function SampleExplorer() {
  const [index, setIndex] = useState(0);
  const sample = SAMPLES[index];
  const count = SAMPLES.length;

  return (
    <figure className={styles.sampleCard}>
      <div className={styles.sampleTabs} role="group" aria-label="Sample conversations">
        {SAMPLES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            aria-pressed={i === index}
            className={i === index ? styles.sampleTabActive : styles.sampleTab}
            onClick={() => setIndex(i)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.sampleBody}>
        {sample.turns.map((turn, i) => (
          <div
            key={`${index}-${i}`}
            className={turn.role === "user" ? styles.turnUser : styles.turnAgent}
          >
            <span className={styles.turnAvatar} aria-hidden="true">
              {turn.role === "user" ? (
                "You"
              ) : (
                <img src="/logo.png" alt="" />
              )}
            </span>
            <div className={styles.turnContent}>
              <span className={styles.turnRole}>
                {turn.role === "user" ? "User" : APP_NAME}
              </span>
              <p>{turn.text}</p>
            </div>
          </div>
        ))}
      </div>

      <figcaption className={styles.sampleFooter}>
        <span className={styles.sampleCount} aria-live="polite">
          Sample {index + 1} of {count}
        </span>
        <span className={styles.sampleNav}>
          <button
            type="button"
            aria-label="Previous sample"
            onClick={() => setIndex((index - 1 + count) % count)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next sample"
            onClick={() => setIndex((index + 1) % count)}
          >
            →
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
