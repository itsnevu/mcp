import AuthGate from "@/components/AuthGate";
import HoodScopeApp from "@/components/HoodScopeApp";

export default function Page() {
  return (
    <AuthGate>
      <HoodScopeApp />
    </AuthGate>
  );
}
