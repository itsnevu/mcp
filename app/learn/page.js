import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, webPageLd, breadcrumbLd } from "@/lib/seo";

const TITLE = "Data usage and Incognito Mode";
const DESCRIPTION = `How ${APP_NAME} handles your chat history, and what Incognito Mode changes: no local history on this device and conversations discarded when you close the chat.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/learn",
  keywords: ["incognito mode", "chat privacy", "data usage", "local history", APP_NAME],
});

export default function LearnPage() {
  return (
    <main className="static-page">
      <JsonLd
        data={[
          webPageLd({ title: TITLE, description: DESCRIPTION, path: "/learn" }),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: TITLE, path: "/learn" },
          ]),
        ]}
      />
      <Link href="/" className="static-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to app
      </Link>
      <div className="static-container">
        <h1>{TITLE}</h1>
        <p>
          At {APP_NAME}, we take your privacy seriously. By default, your chat history is saved locally in your browser
          so you can seamlessly continue conversations right where you left off.
        </p>

        {/* h2, not h3: the heading below sits directly under the h1, and skipping a
            level breaks the document outline a crawler and a screen reader both read. */}
        <h2 style={{ marginTop: "32px", marginBottom: "12px", fontSize: "18px" }}>What is Incognito Mode?</h2>
        <p>
          Incognito Mode lets you interact with the Robinhood Chain network without saving that chat to this
          browser's stored history. When this mode is enabled, your conversations are:
        </p>
        <ul style={{ color: "var(--text-2)", lineHeight: "1.6", marginBottom: "24px", paddingLeft: "20px" }}>
          <li style={{ marginBottom: "8px" }}><strong>Not saved</strong> to your local history.</li>
          <li style={{ marginBottom: "8px" }}><strong>Kept in memory</strong> only while the tab is open.</li>
          <li style={{ marginBottom: "8px" }}><strong>Still sent</strong> to the backend and configured engine so the app can answer.</li>
        </ul>

        <p>
          To enable Incognito Mode, click the ghost icon in the top left corner of your sidebar.
          Treat it as "not saved on this device", not as "not seen by anyone".
        </p>
      </div>
    </main>
  );
}
