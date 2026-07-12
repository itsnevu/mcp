"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./docs.module.css";

/**
 * Section ids must match the ids rendered by the page they belong to. The nav is keyed
 * by route because the links are in-page anchors: rendering /docs's anchors while the
 * reader is on /docs/robinx-mcp would point every one of them at a section that does
 * not exist on the page they are looking at.
 */
const PAGES = [
  {
    path: "/docs",
    label: "API & integration",
    nav: [
      {
        title: "Getting started",
        items: [
          ["overview", "Overview"],
          ["quickstart", "Quickstart"],
          ["configuration", "Configuration"],
        ],
      },
      {
        title: "HTTP API",
        items: [
          ["api", "Endpoints"],
          ["reply-kinds", "Reply kinds"],
          ["limits", "Limits and errors"],
        ],
      },
      {
        title: "The agent",
        items: [
          ["live", "Live mode"],
          ["agent-surface", "On-chain agent surface"],
          ["guardrails", "Guardrails"],
        ],
      },
      {
        title: "Integrate",
        items: [
          ["frontend", "External backend"],
          ["pwa", "Install as app"],
          ["security", "Security"],
        ],
      },
    ],
  },
  {
    path: "/docs/robinx-mcp",
    label: "RobinX MCP",
    nav: [
      {
        title: "RobinX MCP",
        items: [
          ["what", "What it is"],
          ["loop", "The agentic loop"],
          ["registry", "Tool registry"],
          ["fleet", "The MCP fleet"],
        ],
      },
      {
        title: "Trust and reach",
        items: [
          ["safety", "Guardrails"],
          ["x402", "Paid tools"],
          ["roadmap", "Roadmap"],
          ["mcp-faq", "FAQ"],
        ],
      },
    ],
  },
];

export default function DocsNav() {
  const pathname = usePathname();
  const page = PAGES.find((entry) => entry.path === pathname) || PAGES[0];
  const ids = page.nav.flatMap((group) => group.items.map(([id]) => id));

  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!nodes.length) return undefined;

    setActive(ids[0]);

    const onScreen = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target.id);
          else onScreen.delete(entry.target.id);
        }
        // Highlight the highest section still in the reading band, so the marker
        // does not jump ahead while a long section is still being read.
        const top = ids.find((id) => onScreen.has(id));
        if (top) setActive(top);
      },
      { rootMargin: "-90px 0px -62% 0px" },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // ids is derived from pathname, so the observer is rebuilt whenever the page changes.
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav aria-label="Documentation">
      <div className={styles.navGroup}>
        <div className={styles.navGroupTitle}>Documentation</div>
        <ul className={styles.navList}>
          {PAGES.map((entry) => (
            <li key={entry.path}>
              <Link
                href={entry.path}
                className={entry.path === page.path ? styles.navLinkActive : styles.navLink}
                aria-current={entry.path === page.path ? "page" : undefined}
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {page.nav.map((group) => (
        <div className={styles.navGroup} key={group.title}>
          <div className={styles.navGroupTitle}>{group.title}</div>
          <ul className={styles.navList}>
            {group.items.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={active === id ? styles.navLinkActive : styles.navLink}
                  aria-current={active === id ? "true" : undefined}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
