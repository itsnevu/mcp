import AuthGate from "@/components/AuthGate";
import HoodScopeApp from "@/components/HoodScopeApp";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationLd } from "@/lib/seo";

/* The MCP app itself, now reached from the landing page at "/". AuthGate is the login
   screen: an unauthenticated visitor sees the sign-in options here, and only crosses
   into HoodScopeApp once they have a session. */
export default function AppPage() {
  return (
    <>
      <JsonLd data={softwareApplicationLd()} />
      <AuthGate>
        <HoodScopeApp />
      </AuthGate>
    </>
  );
}
