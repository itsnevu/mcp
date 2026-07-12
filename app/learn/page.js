import Link from "next/link";
import { APP_NAME } from "@/lib/chatContract";

export const metadata = { title: `Learn More | ${APP_NAME}` };

export default function LearnPage() {
  return (
    <main className="static-page">
      <Link href="/" className="static-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to app
      </Link>
      <div className="static-container">
        <h1>Data Usage & Incognito Mode</h1>
        <p>
          At {APP_NAME}, we take your privacy seriously. By default, your chat history is saved locally in your browser 
          so you can seamlessly continue conversations right where you left off.
        </p>
        
        <h3 style={{ marginTop: "32px", marginBottom: "12px", fontSize: "18px" }}>What is Incognito Mode?</h3>
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
