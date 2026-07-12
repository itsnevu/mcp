import { APP_NAME } from "@/lib/chatContract";

export const metadata = {
  title: `FAQ | ${APP_NAME}`,
};

export default function FaqPage() {
  return (
    <main className="legal-page">
      <h1>Frequently Asked Questions</h1>
      
      <section className="faq-section" style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>1. General Overview</h2>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>What exactly is {APP_NAME}?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6", marginBottom: "12px" }}>
            {APP_NAME} is a conversational, agentic AI terminal specifically designed for the Robinhood Chain ecosystem. Think of it as a highly specialized financial analyst that lives directly on the blockchain. Instead of manually combing through block explorers, DEX screeners, and contract source codes, you can simply ask {APP_NAME} a question in plain English or Indonesian.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            The underlying engine utilizes state-of-the-art Large Language Models (like Anthropic's Claude 3.5 Sonnet) heavily integrated with the Model Context Protocol (MCP). This allows the AI to autonomously query live on-chain data—such as liquidity pools, token holder distributions, deployer wallet histories, and rug-pull risk factors—and synthesize them into structured, easy-to-read widgets.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>Who is this platform built for?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            {APP_NAME} is built for traders, researchers, auditors, and everyday crypto enthusiasts who need fast, actionable, and evidence-based intelligence on the Robinhood Chain. Whether you are trying to verify if a newly launched meme token is a honeypot, tracking the portfolio of a specific whale wallet, or gauging the overall market sentiment, {APP_NAME} dramatically reduces your research time.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>Do I need an account to use the app?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6", marginBottom: "12px" }}>
            You do not strictly need an account. We offer a <strong>Guest Mode</strong> ("Continue without account") that allows you to explore the application and interact with the AI immediately.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            However, we highly recommend connecting via Google or your Web3 Wallet (like MetaMask). Authenticated users gain access to persistent chat histories across devices, customized AI system instructions, and higher rate limits for complex on-chain queries.
          </p>
        </div>
      </section>

      <section className="faq-section" style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>2. Privacy & Data Handling</h2>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>What is Incognito Mode and how does it work?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6", marginBottom: "12px" }}>
            Incognito Mode is a privacy-first feature designed for users who want to research sensitive tokens or wallets without leaving a trace. When you toggle Incognito Mode (via the ghost icon in the sidebar), the application enforces strict ephemeral data handling:
          </p>
          <ul style={{ color: "var(--text-2)", lineHeight: "1.6", paddingLeft: "20px", marginBottom: "12px" }}>
            <li><strong>No Local Storage:</strong> Chats are kept in active memory and never written to your browser's IndexedDB or LocalStorage.</li>
            <li><strong>No Server Logs:</strong> The backend API strips logging mechanisms for these specific session requests.</li>
            <li><strong>No AI Training:</strong> Your prompts and the associated responses are explicitly flagged via API headers to opt-out of any third-party model training pipelines.</li>
          </ul>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            The moment you refresh the page or close the tab, the entire conversation evaporates permanently.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>Are my wallet credentials safe?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            Absolutely. When you authenticate using a Web3 wallet, {APP_NAME} utilizes the EIP-1193 standard. We only ask you to cryptographically sign a simple text message to prove ownership of the address. We <strong>never</strong> ask for your private keys, seed phrases, or transaction approval permissions during the login process.
          </p>
        </div>
      </section>

      <section className="faq-section" style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>3. Technical Capabilities & Accuracy</h2>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>Where does {APP_NAME} get its data?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            The AI does not rely on static training data for its financial analysis. Instead, it utilizes the <strong>RobinX Model Context Protocol (MCP)</strong>. This protocol provides the AI agent with a suite of highly-optimized, real-time RPC tools. When you ask a question, the AI writes a plan, executes live queries against Robinhood Chain nodes and indexers, and then parses the raw blockchain data to formulate your answer.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>Is the AI's financial analysis guaranteed to be accurate?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6", marginBottom: "12px" }}>
            <strong>No.</strong> While {APP_NAME} is a powerful intelligence tool, it is not infallible. On-chain signals are inherently probabilistic. For example, a token contract might pass all standard "rug check" heuristics (like burned liquidity and renounced ownership), but the developer could still dump a massive un-tracked token supply held in a secondary wallet.
          </p>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            Conversely, a flagged contract is not definitively fraudulent—it may just employ unconventional tokenomics. You must always use {APP_NAME} as a starting point for your research, not as definitive financial advice.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>What are Slash Commands?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            Slash commands are shortcuts designed for power users to bypass the AI's natural language parsing and directly trigger specific on-chain tools. Currently supported commands include <code>/market</code> (for broader macroeconomic trends on the chain), <code>/wallet [address]</code> (to immediately pull the holdings and transaction history of a specific address), and <code>/contract [address]</code> (to force a deep-dive security audit of a smart contract).
          </p>
        </div>
      </section>

      <section className="faq-section" style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>4. Troubleshooting & Settings</h2>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>Why is my data showing as "DEMO DATA"?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            If you see a "DEMO DATA" badge on the UI widgets, it means the application is currently running in Demo Mode. This occurs when the backend server is not configured with live API credentials (like the Anthropic API Key for Claude or the RobinX API keys). In this state, the app will return illustrative, mock data to demonstrate the UI capabilities without incurring live API costs. If you are running the app locally, check the developer documentation to learn how to configure your <code>.env</code> file.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "var(--accent)" }}>How do I change the language or UI theme?</h3>
          <p style={{ color: "var(--text-2)", lineHeight: "1.6" }}>
            Click the gear icon located at the bottom of the sidebar to open the Global Settings Modal. From there, you can toggle the visual theme (Dark/Light mode) and select your preferred language (English or Bahasa Indonesia). The entire application, including dynamic text placeholders and AI system prompts, will adjust instantly to your selection.
          </p>
        </div>
      </section>
    </main>
  );
}
