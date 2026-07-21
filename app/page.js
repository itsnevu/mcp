import Landing from "@/components/Landing";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationLd } from "@/lib/seo";

/* "/" is now the landing page. The app itself lives at /app, reached via the Login button —
   AuthGate there is the login screen, and the MCP loads once a session exists. */
export default function Page() {
  return (
    <>
      <JsonLd data={softwareApplicationLd()} />
      <Landing />
    </>
  );
}
