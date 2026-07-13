import { APP_NAME, CHAIN_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, faqPageLd, webPageLd } from "@/lib/seo";

const TITLE = "Frequently Asked Questions";
const DESCRIPTION = `Answers about ${APP_NAME}: what it is, where its on-chain data comes from, how Incognito Mode and wallet login protect you, how accurate the analysis is, and what happens when the live engine is unavailable.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/faq",
  keywords: [
    `${APP_NAME} FAQ`,
    "what is agentic AI",
    "agentic AI",
    "agentic AI crypto",
    "AI agent",
    "incognito mode",
    "wallet login safety",
    "live engine unavailable",
    "slash commands",
    "rug check accuracy",
    `${CHAIN_NAME} AI`,
  ],
});

/* Both the page and its FAQPage structured data are generated from this one array.
   Google only awards the FAQ rich result when the marked-up answer is the answer a
   visitor actually sees, so a second hand-kept copy for the crawler is not a
   shortcut — it is the exact thing that gets the rich result revoked when it drifts.

   Answers are HTML because Google's FAQPage answer field accepts a small tag
   whitelist and rendering it verbatim is what keeps the two in step. */
const faqSections = [
  {
    id: "general",
    heading: "1. General Overview",
    items: [
      {
        question: `What exactly is ${APP_NAME}?`,
        answer: `<p>${APP_NAME} is a conversational, agentic AI terminal specifically designed for the ${CHAIN_NAME} ecosystem. Think of it as a highly specialized financial analyst that lives directly on the blockchain. Instead of manually combing through block explorers, DEX screeners, and contract source codes, you can simply ask ${APP_NAME} a question in plain language.</p><p>The underlying <strong>RobinX engine</strong> utilizes a state-of-the-art frontier reasoning model heavily integrated with the Model Context Protocol (MCP). This allows the AI to autonomously query live on-chain data — such as liquidity pools, token holder distributions, deployer wallet histories, and rug-pull risk factors — and synthesize them into structured, easy-to-read widgets.</p>`,
      },
      {
        question: `What does "agentic AI" actually mean, and why does ${APP_NAME} call itself one?`,
        answer: `<p>A conventional chatbot answers from what it memorised during training. An <strong>agentic AI</strong> does something different: given a goal, it plans the steps, decides which tools it needs, calls them, reads the results, and keeps going until it can answer. The "agentic" part is the autonomy — you state an outcome, not a procedure.</p><p>${APP_NAME} is agentic in exactly that sense. Ask it "is this token safe?" and the agent decides on its own to resolve the contract address, pull the holder distribution, fetch the deployer's history, and check the liquidity — then reasons over what came back. It is not retrieving a pre-written answer, and it is not guessing from training data: every step is a live tool call against ${CHAIN_NAME}, and the evidence is shown to you alongside the conclusion.</p>`,
      },
      {
        question: "Who is this platform built for?",
        answer: `<p>${APP_NAME} is built for traders, researchers, auditors, and everyday crypto enthusiasts who need fast, actionable, and evidence-based intelligence on the ${CHAIN_NAME}. Whether you are trying to verify if a newly launched meme token is a honeypot, tracking the portfolio of a specific whale wallet, or gauging the overall market sentiment, ${APP_NAME} dramatically reduces your research time.</p>`,
      },
      {
        question: "Do I need an account to use the app?",
        answer: `<p>You do not strictly need an account. We offer a <strong>Guest Mode</strong> ("Continue without account") that allows you to explore the application and interact with the AI immediately.</p><p>However, we highly recommend connecting via Google or your Web3 Wallet (like MetaMask). Authenticated users gain access to persistent chat histories across devices, customized AI system instructions, and higher rate limits for complex on-chain queries.</p>`,
      },
    ],
  },
  {
    id: "privacy",
    heading: "2. Privacy & Data Handling",
    items: [
      {
        question: "What is Incognito Mode and how does it work?",
        answer: `<p>Incognito Mode is a privacy-first feature designed for users who want to research sensitive tokens or wallets without leaving a trace. When you toggle Incognito Mode (via the ghost icon in the sidebar), the application enforces strict ephemeral data handling:</p><ul><li><strong>No Local Storage:</strong> Chats are kept in active memory and never written to your browser's IndexedDB or LocalStorage.</li><li><strong>No Server Logs:</strong> The backend API strips logging mechanisms for these specific session requests.</li><li><strong>No AI Training:</strong> Your prompts and the associated responses are explicitly flagged via API headers to opt out of any third-party model training pipelines.</li></ul><p>The moment you refresh the page or close the tab, the entire conversation evaporates permanently.</p>`,
      },
      {
        question: "Are my wallet credentials safe?",
        answer: `<p>Absolutely. When you authenticate using a Web3 wallet, ${APP_NAME} utilizes the EIP-1193 standard. We only ask you to cryptographically sign a simple text message to prove ownership of the address. We <strong>never</strong> ask for your private keys, seed phrases, or transaction approval permissions during the login process.</p>`,
      },
    ],
  },
  {
    id: "capabilities",
    heading: "3. Technical Capabilities & Accuracy",
    items: [
      {
        question: `Where does ${APP_NAME} get its data?`,
        answer: `<p>The AI does not rely on static training data for its financial analysis. Instead, it utilizes the <strong>RobinX Model Context Protocol (MCP)</strong>. This protocol provides the AI agent with a suite of highly-optimized, real-time RPC tools. When you ask a question, the AI writes a plan, executes live queries against ${CHAIN_NAME} nodes and indexers, and then parses the raw blockchain data to formulate your answer.</p>`,
      },
      {
        question: "Is the AI's financial analysis guaranteed to be accurate?",
        answer: `<p><strong>No.</strong> While ${APP_NAME} is a powerful intelligence tool, it is not infallible. On-chain signals are inherently probabilistic. For example, a token contract might pass all standard "rug check" heuristics (like burned liquidity and renounced ownership), but the developer could still dump a massive un-tracked token supply held in a secondary wallet.</p><p>Conversely, a flagged contract is not definitively fraudulent — it may just employ unconventional tokenomics. You must always use ${APP_NAME} as a starting point for your research, not as definitive financial advice.</p>`,
      },
      {
        question: "What are Slash Commands?",
        answer: `<p>Slash commands are shortcuts designed for power users to bypass the AI's natural language parsing and directly trigger specific on-chain tools. Currently supported commands include <code>/market</code> (for broader macroeconomic trends on the chain), <code>/wallet [address]</code> (to immediately pull the holdings and transaction history of a specific address), and <code>/contract [address]</code> (to force a deep-dive security audit of a smart contract).</p>`,
      },
    ],
  },
  {
    id: "troubleshooting",
    heading: "4. Troubleshooting & Settings",
    items: [
      {
        question: "Why does the app say the engine is unavailable?",
        answer: `<p>The chat endpoint only answers when the live RobinX engine is configured and reachable. If credentials are missing, the engine is down, or the request times out, the app returns an unavailable state instead of fabricated market data. If you are running the app locally, check the developer documentation to configure your <code>.env</code> file.</p>`,
      },
      {
        question: "How do I change the language or UI theme?",
        answer: `<p>Open Settings from the gear icon in the sidebar header, or from the user menu at the bottom (⇧⌘,). Under General you can switch the visual theme (Dark/Light) and pick your interface language — English, 中文, Español, 日本語, or 한국어. Language can also be changed straight from the user menu. The entire interface updates instantly.</p>`,
      },
    ],
  },
];

/* Google's FAQPage answer accepts only a small tag whitelist, and <code> is not on
   it. The reader keeps the monospace styling; the structured data gets <strong>. */
function toStructuredAnswer(html) {
  return html.replace(/<(\/?)code>/g, "<$1strong>");
}

const structuredItems = faqSections.flatMap((section) =>
  section.items.map((item) => ({
    question: item.question,
    answer: toStructuredAnswer(item.answer),
  })),
);

export default function FaqPage() {
  return (
    <main className="legal-page">
      <JsonLd
        data={[
          faqPageLd(structuredItems, "/faq"),
          webPageLd({ title: TITLE, description: DESCRIPTION, path: "/faq" }),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ]}
      />

      <h1>{TITLE}</h1>

      {faqSections.map((section) => (
        <section key={section.id} id={section.id} className="faq-section">
          <h2>{section.heading}</h2>

          {section.items.map((item) => (
            <div key={item.question} className="faq-item">
              <h3>{item.question}</h3>
              <div
                className="faq-answer"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
