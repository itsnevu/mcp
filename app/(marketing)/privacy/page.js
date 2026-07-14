import { APP_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, webPageLd } from "@/lib/seo";

/* This page is held to the same rule as every other claim in this product: nothing is written here
 * that the code does not do. That cuts both ways — it is why the voice section says plainly that we
 * send your microphone audio to Google, rather than not mentioning voice at all, which is what this
 * page did before. A privacy policy that flatters the product is not a privacy policy. */

const TITLE = "Privacy policy";
const DESCRIPTION = `What ${APP_NAME} sends, where it sends it, and what stays in your browser — including the microphone audio that voice mode sends to your browser vendor.`;

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
        Short version: your chats stay in your browser, but the things you ask about leave it. Below is
        exactly what goes where. If a line here ever stops matching the code, the line is the bug.
      </p>

      <h2>Voice mode sends your microphone audio to a third party</h2>
      <p>
        This is the one that matters most, so it goes first.
      </p>
      <p>
        Voice mode uses your browser&apos;s built-in speech recognition. In most browsers that is{" "}
        <strong>not</strong> processed on your device — your microphone audio is streamed to the
        browser vendor&apos;s servers and text comes back. In Chrome that vendor is Google. In Safari it
        is Apple. In Edge it is Microsoft. {APP_NAME} never receives your raw audio, and never stores
        it, but we are the reason it is sent, so we are telling you.
      </p>
      <p>
        The reply is spoken back using your operating system&apos;s voices. Some of those voices are
        also synthesised remotely by the browser vendor, which means the assistant&apos;s reply text can
        be sent to them as well.
      </p>
      <p>
        If you do not want any of that, do not use voice mode. Typing the same question sends nothing to
        Google, Apple, or Microsoft.
      </p>

      <h2>What stays in your browser</h2>
      <p>
        Chat history and interface preferences (theme, language, mode) are stored in your browser&apos;s
        localStorage. They are not uploaded to us. Clearing site data removes them permanently — we
        cannot restore them, because we never had them.
      </p>

      <h2>What is sent when you ask a question</h2>
      <p>
        Your message, the recent messages in that conversation, and any file you attach are sent to the
        chat backend, and from there to the language-model engine that answers. Attached images are sent
        as image data; attached documents are sent as extracted text.
      </p>
      <p>
        To answer questions about a token, the engine calls tools. Those tools reach outside services —
        the Robinhood Chain RPC, DexScreener for market data, and the analysis servers configured for
        this deployment. They receive whatever the question requires, which is typically a contract
        address or a ticker. They do not receive your conversation.
      </p>
      <p>
        Your IP address is used to rate-limit requests and to enforce spending caps. That is the only
        thing it is used for.
      </p>

      <h2>Incognito chats</h2>
      <p>
        An incognito chat is <strong>not written to your browser&apos;s stored history</strong>. That is
        what the setting does, and it does it completely.
      </p>
      <p>
        It does not make the request private. The message is still sent to the backend and still sent to
        the engine, exactly as a normal chat is. We do not control whether the engine provider retains
        or trains on what it receives, and incognito mode does not change what they receive. Treat
        incognito as &quot;not saved on this device&quot;, not as &quot;not seen by anyone&quot;.
      </p>

      <h2>Signing in</h2>
      <p>
        Signing in with Google gives us the email address on that account, and nothing else. Signing in
        with a wallet asks you to sign a login message — a plain text string proving you hold the key.
        It is not a transaction, it cannot move funds, and {APP_NAME} never asks you to approve one.
      </p>

      <h2>Never paste a secret</h2>
      <p>
        Never enter private keys, recovery phrases, passwords, or seed words into the chat. No part of
        this product will ever ask you for one, and anything that does is not us.
      </p>
    </main>
  );
}
