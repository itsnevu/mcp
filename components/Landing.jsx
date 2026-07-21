"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "@/app/landing.module.css";

/* The entry page before the MCP app. "Login" (nav + hero) routes to /app, where AuthGate is the
   login screen and, once signed in, the MCP itself. Style echoes a modern studio landing; all
   assets and copy are Bugglo's own. */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menu = [
    { href: "/intro", label: "the tool" },
    { href: "/learn", label: "how it works" },
    { href: "/docs/bugglo-cli", label: "for agents" },
  ];

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navShell}>
          <div className={styles.navRow}>
            <Link href="/" className={styles.brand}>
              <Image src="/logo-128.png" alt="" width={36} height={36} className={styles.brandLogo} />
              <span className={styles.brandName}>
                Bugglo<span className={styles.serif}>.</span>
              </span>
            </Link>
            <div className={styles.navRight}>
              <Link href="/app" className={styles.loginBtn}>
                login
              </Link>
              <button
                type="button"
                className={`${styles.menuToggle} ${menuOpen ? styles.open : ""}`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                +
              </button>
            </div>
          </div>
          <div className={`${styles.menu} ${menuOpen ? styles.open : ""}`} aria-hidden={!menuOpen}>
            {menu.map((m) => (
              <Link key={m.href} href={m.href} className={styles.menuLink}>
                <span>{m.label}</span>
                <span aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <Image
          src="/bugglo.png"
          alt=""
          aria-hidden="true"
          width={820}
          height={820}
          priority
          className={styles.heroArt}
        />

        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Robinhood Chain · 4663
          </span>
          <h1 className={styles.headline}>
            Read before
            <br />
            you ape<span className={styles.serif}>.</span>
          </h1>
          <p className={styles.subline}>
            Bugglo is the safety layer for onchain agents — a read-only rug check and pre-trade
            firewall that tells you the plain truth about a contract before your money moves.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/app" className={styles.ctaPrimary}>
              login to Bugglo
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/intro" className={styles.ctaGhost}>
              how it works
            </Link>
          </div>
        </div>

        <div className={styles.footNote}>Read-only · no API key · not financial advice</div>
      </section>
    </div>
  );
}
