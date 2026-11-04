"use client";

import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { switchMode } from "@/lib/adminMode";
import Switch from "@/components/common/Switch";

// Shown only to admins: on = the admin dashboard, off = FitMate as a normal user.
export default function AdminSwitch({ compact = false }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  if (user?.app_metadata?.role !== "admin") return null;
  const on = pathname.startsWith("/admin");
  const flip = (next) => switchMode(router, next);

  // Phone header: one 36px button (a full switch made the header too wide on small phones).
  if (compact === "header") {
    return (
      <button
        type="button"
        onClick={() => flip(!on)}
        aria-label={on ? "Leave admin mode" : "Admin mode"}
        aria-pressed={on}
        title={on ? "Leave admin mode" : "Admin mode"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${on ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"}`}
      >
        <ShieldCheck className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3 ${compact ? "py-2" : "py-3"} ${on ? "border-emerald-500/40 bg-emerald-500/10" : "border-neutral-200 dark:border-neutral-800"}`}>
      <ShieldCheck className={`h-5 w-5 shrink-0 ${on ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Admin mode</span>
        {!compact && <span className="block text-xs text-neutral-500">{on ? "Showing the admin dashboard" : "Open the admin dashboard"}</span>}
      </span>
      <Switch checked={on} onChange={flip} label="Admin mode" />
    </div>
  );
}
