import BottomNav from "@/components/common/BottomNav";
import Logo from "@/components/common/Logo";
import AccountButton from "@/components/auth/AccountButton";
import AuthGate from "@/components/auth/AuthGate";

export default function DashboardLayout({ children }) {
  return (
    <AuthGate>
      <BottomNav />
      <div className="md:pl-64">
        <header className="flex items-center justify-between px-4 pt-4 md:hidden">
          <Logo />
          <AccountButton variant="header" />
        </header>
        <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 md:px-8 md:pt-10 md:pb-12">{children}</main>
      </div>
    </AuthGate>
  );
}
