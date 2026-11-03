"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/supabase/authErrors";
import { useAuth } from "./AuthProvider";
import { primaryButton, labelClass } from "@/components/common/ui";
import PasswordInput from "./PasswordInput";

// Reached from the reset email via /auth/callback, which has already signed the user in.
export default function ResetPasswordForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;
  if (!user) {
    return (
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight">Reset link needed</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">Open the link from your password reset email to set a new password.</p>
        <Link href="/login" className={`${primaryButton} mt-6 block text-center`}>
          Back to sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(friendlyAuthError(error));
    router.replace("/home");
  }

  return (
    <form onSubmit={onSubmit} className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-sm text-neutral-500">For {user.email}</p>
      </div>
      <div>
        <label htmlFor="new-password" className={labelClass}>
          New password
        </label>
        <PasswordInput id="new-password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label htmlFor="confirm-password" className={labelClass}>
          Confirm password
        </label>
        <PasswordInput id="confirm-password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
