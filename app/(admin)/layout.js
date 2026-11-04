import AuthGate from "@/components/auth/AuthGate";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Admin" };

// The admin dashboard has its own shell (no app tabs).
export default function AdminLayout({ children }) {
  return (
    <AuthGate requireOnboarded={false}>
      <AdminShell>{children}</AdminShell>
    </AuthGate>
  );
}
