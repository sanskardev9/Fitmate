"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Dumbbell, Utensils, ChartColumn, ClipboardList } from "lucide-react";
import AdminSwitch from "@/components/admin/AdminSwitch";
import Logo from "./Logo";
import AccountButton from "@/components/auth/AccountButton";
import ThemeToggle from "./ThemeToggle";

const TABS = [
  { href: "/home", label: "Home", Icon: House },
  { href: "/workout", label: "Workout", Icon: Dumbbell },
  { href: "/diet", label: "Diet", Icon: Utensils },
  { href: "/progress", label: "Progress", Icon: ChartColumn },
  { href: "/plans", label: "Plans", Icon: ClipboardList },
];

// Bottom tab bar on phones, fixed sidebar from the md breakpoint up.
export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-neutral-200 bg-white/80 px-4 py-6 backdrop-blur-xl md:flex dark:border-neutral-800 dark:bg-neutral-950/80">
        <Link href="/home" className="mb-8 px-3">
          <Logo />
        </Link>
        <ul className="space-y-1">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${active ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30" : "bg-neutral-100 text-neutral-500 group-hover:text-neutral-800 dark:bg-neutral-900 dark:group-hover:text-neutral-200"}`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  {label}
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
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-neutral-800 dark:bg-neutral-950/90">
        <ul className="flex px-1">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href} className="flex-1">
                <Link href={href} className={`flex flex-col items-center gap-1 pt-2 pb-1.5 text-[10px] font-medium ${active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-emerald-500/15" : ""}`}>
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
