import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import CookieConsent from "./CookieConsent";
import styles from "./marketing.module.css";

export default function MarketingLayout({ children }) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <nav className={styles.topbarInner} aria-label="Primary">
          <Link href="/intro" className={styles.brand}>
            <span className={styles.brandMark}>
              <img src="/logo.png" alt="" />
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/platform">Platform</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
          <Link href="/" className={styles.navCta}>
            Try {APP_NAME}
            <span aria-hidden="true" className={styles.arrow}>
              ↗
            </span>
          </Link>
        </nav>
      </header>

      {children}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.brandMark}>
              <img src="/logo.png" alt="" />
            </span>
            <span>{APP_NAME}</span>
          </div>
          <div className={styles.footerCols}>
            <div>
              <h3>Product</h3>
              <Link href="/">Try {APP_NAME}</Link>
              <Link href="/intro">Introducing {APP_NAME}</Link>
              <Link href="/docs#pwa">Install as app</Link>
            </div>
            <div>
              <h3>Developers</h3>
              <Link href="/platform">Platform</Link>
              <Link href="/docs">Documentation</Link>
              <Link href="/docs#api">API reference</Link>
              <Link href="/docs#live">Live mode setup</Link>
            </div>
            <div>
              <h3>Legal</h3>
              <Link href="/terms">Terms of use</Link>
              <Link href="/privacy">Privacy policy</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 {APP_NAME}. Built on Robinhood Chain.</span>
          <span>Research tool — not financial advice.</span>
        </div>
      </footer>

      <CookieConsent />
    </div>
  );
}
