import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import { NOINDEX } from "@/lib/seo";

/* Served with a 404 status, so a crawler will not index it whatever we say — but
   the tag also covers the case where this component is rendered for a route that
   resolved with a 200, which is exactly the soft-404 Google penalises. */
export const metadata = {
  title: "Page not found",
  description: "The link you followed may be broken, or the page may have moved.",
  robots: NOINDEX,
};

export default function NotFound() {
  return (
    <main className="static-page">
      <div className="static-container" style={{ textAlign: "center", padding: "60px 40px" }}>
        <h1 style={{ fontSize: "64px", margin: "0 0 16px", color: "var(--accent)" }}>404</h1>
        <h2 style={{ fontSize: "24px", margin: "0 0 24px" }}>Page Not Found</h2>
        <p style={{ marginBottom: "32px" }}>
          The link you followed may be broken, or the page may have been removed.
        </p>
        {/* A 404 is a dead end for a crawler unless it can walk back into the site
            from here, so the exits are real links, not a history.back() button. */}
        <Link href="/" className="btn primary" style={{ display: "inline-flex", textDecoration: "none" }}>
          Return to {APP_NAME}
        </Link>
        <p style={{ marginTop: "28px", fontSize: "14px" }}>
          Or head to <Link href="/intro">the introduction</Link>,{" "}
          <Link href="/docs">the developer docs</Link>, or{" "}
          <Link href="/faq">the FAQ</Link>.
        </p>
      </div>
    </main>
  );
}
