import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import { NOINDEX } from "@/lib/seo";

/* The service worker's fallback shell. It is a real route so the worker can serve
   it, but a searcher who lands here has been handed a dead page — hence noindex,
   matching the disallow in robots.js and its absence from the sitemap. */
export const metadata = {
  title: "Offline",
  description: `${APP_NAME} is installed but currently has no network connection.`,
  robots: NOINDEX,
  /* Self-canonical, because an unset canonical inherits the root layout's "/" —
     which would have this shell declaring itself to be the home page. */
  alternates: { canonical: "/offline" },
};

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <section className="offline-panel">
        <div className="auth-mark">H</div>
        <div>
          <div className="auth-kicker">Offline mode</div>
          <h1>You are offline</h1>
          <p>
            {APP_NAME} is installed, but live chat and API calls need a network connection. Reconnect
            to use Google login, wallet login, and RobinX-backed responses.
          </p>
        </div>
        <Link href="/" className="docs-primary-link">Retry app</Link>
      </section>
    </main>
  );
}
