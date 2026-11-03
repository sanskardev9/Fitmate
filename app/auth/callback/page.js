import AuthShell from "@/components/auth/AuthShell";
import AuthCallback from "@/components/auth/AuthCallback";

export const metadata = { title: "Signing in" };

export default function AuthCallbackPage() {
  return (
    <AuthShell>
      <AuthCallback />
    </AuthShell>
  );
}
