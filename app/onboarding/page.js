import AuthGate from "@/components/auth/AuthGate";
import Onboarding from "@/components/onboarding/Onboarding";

export const metadata = { title: "Set up FitMate" };

export default function OnboardingPage() {
  return (
    <AuthGate requireOnboarded={false}>
      <Onboarding />
    </AuthGate>
  );
}
