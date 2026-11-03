import AuthGate from "@/components/auth/AuthGate";
import ActiveSession from "@/components/workout/ActiveSession";

export const metadata = { title: "Workout" };

// Full-screen workout mode, outside the tabbed app layout.
export default function SessionPage() {
  return (
    <AuthGate>
      <ActiveSession />
    </AuthGate>
  );
}
