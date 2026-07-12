"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./marketing.module.css";

const STORAGE_KEY = "hoodscope.cookie-consent";

function readConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics, marketing) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ essential: true, analytics, marketing, decidedAt: new Date().toISOString() })
    );
  } catch {
    // localStorage unavailable (private mode) - the banner will simply reappear next visit
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!readConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (a, m) => {
    saveConsent(a, m);
    setVisible(false);
  };

  return (
    <div className={styles.cookie} role="region" aria-label="Cookie consent">
      <div className={styles.cookieCard}>
        {!managing ? (
          <>
            <h2 className={styles.cookieTitle}>We use cookies</h2>
            <p className={styles.cookieText}>
              We use cookies to help this site function, understand service usage, and support
              marketing efforts. Visit{" "}
              <button
                type="button"
                className={styles.cookieLinkBtn}
                onClick={() => setManaging(true)}
              >
                Manage Cookies
              </button>{" "}
              to change preferences anytime. View our <Link href="/privacy">Cookie Policy</Link>{" "}
              for more info.
            </p>
            <div className={styles.cookieActions}>
              <button
                type="button"
                className={styles.cookieBtn}
                onClick={() => setManaging(true)}
              >
                Manage Cookies
              </button>
              <button
                type="button"
                className={styles.cookieBtn}
                onClick={() => decide(false, false)}
              >
                Reject non-essential
              </button>
              <button
                type="button"
                className={styles.cookieBtn}
                onClick={() => decide(true, true)}
              >
                Accept all
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.cookieBack}
              onClick={() => setManaging(false)}
            >
              <span aria-hidden="true">←</span> Back
            </button>
            <h2 className={styles.cookieTitle}>Manage cookie preferences</h2>
            <div className={styles.cookiePrefs}>
              <div className={styles.prefRow}>
                <div className={styles.prefInfo}>
                  <strong>Strictly necessary</strong>
                  <span>
                    Required for sign-in, security, and core functionality. These cannot be
                    turned off.
                  </span>
                </div>
                <span className={styles.prefAlways}>Always on</span>
              </div>
              <div className={styles.prefRow}>
                <div className={styles.prefInfo}>
                  <strong>Analytics</strong>
                  <span>Help us understand how the service is used so we can improve it.</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analytics}
                  aria-label="Analytics cookies"
                  className={analytics ? `${styles.switch} ${styles.switchOn}` : styles.switch}
                  onClick={() => setAnalytics((v) => !v)}
                />
              </div>
              <div className={styles.prefRow}>
                <div className={styles.prefInfo}>
                  <strong>Marketing</strong>
                  <span>Used to measure the effectiveness of our communications.</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={marketing}
                  aria-label="Marketing cookies"
                  className={marketing ? `${styles.switch} ${styles.switchOn}` : styles.switch}
                  onClick={() => setMarketing((v) => !v)}
                />
              </div>
            </div>
            <div className={styles.cookieActions}>
              <button
                type="button"
                className={styles.cookieBtn}
                onClick={() => decide(analytics, marketing)}
              >
                Save preferences
              </button>
              <button
                type="button"
                className={styles.cookieBtn}
                onClick={() => decide(true, true)}
              >
                Accept all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
