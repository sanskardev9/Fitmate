"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, MessageSquare, Bell, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import AdminSwitch from "./AdminSwitch";
import { LogoMark } from "@/components/common/Logo";
import ThemeToggle from "@/components/common/ThemeToggle";
import AccountButton from "@/components/auth/AccountButton";

export async function adminApi(path, opts = {}) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(opts.headers ?? {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || "Request failed"), { status: res.status });
  return json;
}

// Users + feedback are loaded once for the whole dashboard, so moving between pages is instant.
const AdminData = createContext(null);
export const useAdminData = () => useContext(AdminData);

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/plans", label: "Plans", Icon: ClipboardList },
  { href: "/admin/feedback", label: "Feedback", Icon: MessageSquare },
  { href: "/admin/notifications", label: "Notify", Icon: Bell },
];

export default function AdminShell({ children }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [users, setUsers] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const isAdmin = user?.app_metadata?.role === "admin";

  const load = useCallback(() => {
    setError("");
    adminApi("/api/admin/users")
      .then((j) => setUsers(j.users))
      .catch((e) => setError(e.message));
    adminApi("/api/admin/feedback")
      .then((j) => setFeedback(j.feedback))
      .catch(() => setFeedback([]));
  }, []);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-5">
        <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
          <p className="mt-3 text-lg font-semibold">Admins only</p>
          <p className="mt-1 text-sm text-neutral-500">This area is for the FitMate team.</p>
          <Link href="/home" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
            Go to FitMate
          </Link>
        </div>
      </div>
    );
  }

  const unread = feedback?.filter((f) => f.status === "new").length ?? 0;
  const isActive = (href) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));
  const badge = (href) => (href === "/admin/feedback" && unread ? unread : null);

  return (
    <AdminData.Provider value={{ users, setUsers, feedback, setFeedback, error, reload: load }}>
      {/* Desktop: admin sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-neutral-200 bg-white px-4 py-6 md:flex dark:border-neutral-800 dark:bg-neutral-950">
        <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-3">
          <LogoMark className="h-9 w-9" />
          <span className="leading-tight">
            <span className="block text-lg font-bold">
              Fit<span className="text-emerald-600 dark:text-emerald-400">Mate</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              <ShieldCheck className="h-3 w-3" /> Admin
            </span>
          </span>
        </Link>
        <ul className="space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"}`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${active ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30" : "bg-neutral-100 text-neutral-500 group-hover:text-neutral-800 dark:bg-neutral-900 dark:group-hover:text-neutral-200"}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {badge(href) && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{badge(href)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <AdminSwitch compact />
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <AccountButton variant="sidebar" />
            </div>
            <ThemeToggle withSystem placement="up" />
          </div>
        </div>
      </aside>

      {/* Phones / tablets: slim header on top, admin tabs in the bottom bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-xl md:hidden dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-bold">Admin</span>
          </Link>
          <AdminSwitch compact="header" />
          <ThemeToggle withSystem />
          <AccountButton variant="header" />
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-neutral-800 dark:bg-neutral-950/90">
        <ul className="flex px-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href} className="flex-1">
                <Link href={href} className={`flex flex-col items-center gap-1 pt-2 pb-1.5 text-[10px] font-medium ${active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>
                  <span className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-emerald-500/15" : ""}`}>
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                    {badge(href) && <span className="absolute -top-0.5 right-1 rounded-full bg-emerald-600 px-1 text-[10px] leading-4 font-bold text-white tabular-nums">{badge(href)}</span>}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="md:pl-64">
        <main key={pathname} className="animate-fade-up mx-auto max-w-6xl px-4 pt-5 pb-28 [animation-duration:350ms] md:pb-12 md:px-8 md:pt-10">
          {error && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              <span>{error}</span>
              <button type="button" onClick={load} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </AdminData.Provider>
  );
}
