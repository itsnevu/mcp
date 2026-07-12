import { APP_NAME } from "@/lib/chatContract";

export const metadata = {
  title: `Privacy | ${APP_NAME}`,
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
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
