import AuthGate from "@/components/AuthGate";
import HoodScopeApp from "@/components/HoodScopeApp";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationLd } from "@/lib/seo";

/* Title, description, canonical and the Open Graph card for "/" are the site-wide
   defaults, so this route deliberately declares no metadata of its own — restating
   them would only create a second copy to keep in step with the root layout. What
   *is* particular to this page is the product entity it serves. */
export default function Page() {
  return (
    <>
      <JsonLd data={softwareApplicationLd()} />
      <AuthGate>
        <HoodScopeApp />
      </AuthGate>
    </>
  );
}
