import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";

export default function NotFound() {
  return (
    <main className="static-page">
      <div className="static-container" style={{ textAlign: "center", padding: "60px 40px" }}>
        <h1 style={{ fontSize: "64px", margin: "0 0 16px", color: "var(--accent)" }}>404</h1>
        <h2 style={{ fontSize: "24px", margin: "0 0 24px" }}>Page Not Found</h2>
        <p style={{ marginBottom: "32px" }}>
          The link you followed may be broken, or the page may have been removed.
        </p>
        <Link href="/" className="btn primary" style={{ display: "inline-flex", textDecoration: "none" }}>
          Return to {APP_NAME}
        </Link>
      </div>
    </main>
  );
}
