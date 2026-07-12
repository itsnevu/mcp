import { APP_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, webPageLd } from "@/lib/seo";

const TITLE = "Privacy policy";
const DESCRIPTION = `How ${APP_NAME} handles your data: chat history and interface preferences are stored in your browser's localStorage, and clearing site data removes that local history.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <JsonLd
        data={[
          webPageLd({ title: TITLE, description: DESCRIPTION, path: "/privacy" }),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: TITLE, path: "/privacy" },
          ]),
        ]}
      />
      <h1>Privacy</h1>
      <p>
        {APP_NAME} stores chat history and interface preferences in your browser localStorage.
        Clearing site data removes that local history.
      </p>
      <p>
        When a live backend is configured, chat prompts and recent context are sent to the backend
        endpoint you selected. Demo mode runs with local placeholder responses.
      </p>
      <p>
        Never enter private keys, recovery phrases, passwords, or other secrets into the chat.
      </p>
    </main>
  );
}
