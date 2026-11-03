import StreakScreen from "@/components/home/StreakScreen";
import AuthGate from "@/components/auth/AuthGate";

export const metadata = { title: "Streak" };

export default function StreakPage() {
  return (
    <AuthGate>
      <StreakScreen />
    </AuthGate>
  );
}
