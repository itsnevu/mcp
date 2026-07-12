import { APP_NAME } from "@/lib/chatContract";

export const metadata = {
  title: `Terms | ${APP_NAME}`,
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <h1>Terms</h1>
      <p>
        {APP_NAME} is a prototype research interface for Robinhood Chain data. It is not financial,
        legal, tax, or investment advice.
      </p>
      <p>
        Live results may depend on third-party APIs, MCP tools, and paid data sources. Verify all
        market, token, wallet, and deployer information independently before acting.
      </p>
      <p>
        Do not submit secrets, private keys, seed phrases, or sensitive personal information.
      </p>
    </main>
  );
}
