import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, webPageLd, breadcrumbLd } from "@/lib/seo";

const TITLE = "Data usage and Incognito Mode";
const DESCRIPTION = `How ${APP_NAME} handles your chat history, and what Incognito Mode changes: no local history, no model training, and conversations discarded the moment you close the chat.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/learn",
  keywords: ["incognito mode", "chat privacy", "data usage", "AI training opt-out", APP_NAME],
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
          Incognito Mode allows you to interact with the Robinhood Chain network without leaving a trace. 
          When this mode is enabled, your conversations are:
        </p>
        <ul style={{ color: "var(--text-2)", lineHeight: "1.6", marginBottom: "24px", paddingLeft: "20px" }}>
          <li style={{ marginBottom: "8px" }}><strong>Not saved</strong> to your local history.</li>
          <li style={{ marginBottom: "8px" }}><strong>Not used</strong> to train any future AI models.</li>
          <li style={{ marginBottom: "8px" }}><strong>Immediately discarded</strong> once you close the chat or refresh the page.</li>
        </ul>

        <p>
          To enable Incognito Mode, simply click the ghost icon in the top left corner of your sidebar. 
          The interface will adapt to remind you that you are currently off the record.
        </p>
      </div>
    </main>
  );
}
