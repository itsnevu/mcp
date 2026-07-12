import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";

export const metadata = {
  title: `Offline | ${APP_NAME}`,
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
