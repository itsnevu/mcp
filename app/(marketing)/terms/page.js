import { APP_NAME, CHAIN_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, breadcrumbLd, webPageLd } from "@/lib/seo";

const TITLE = "Terms of use";
const DESCRIPTION = `The terms covering ${APP_NAME}, a prototype research interface for ${CHAIN_NAME} data. It is not financial, legal, tax, or investment advice.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="legal-page">
      <JsonLd
        data={[
          webPageLd({ title: TITLE, description: DESCRIPTION, path: "/terms" }),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: TITLE, path: "/terms" },
          ]),
        ]}
      />
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
