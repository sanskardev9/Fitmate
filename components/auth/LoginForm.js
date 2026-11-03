"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, authRedirect } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/supabase/authErrors";
import { useAuth } from "./AuthProvider";
import { inputClass, primaryButton, labelClass } from "@/components/common/ui";
import Segmented from "@/components/common/Segmented";
import PasswordInput from "./PasswordInput";

const MODES = [
  ["signin", "Sign in"],
  ["signup", "Create account"],
];

export default function LoginForm() {
  const router = useRouter();
  const { user, enabled } = useAuth();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const [next, setNext] = useState("/home");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("next");
    if (n?.startsWith("/")) setNext(n);
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  if (!enabled) {
    return (
      <Notice title="Accounts aren't set up" text="This copy of FitMate has no Supabase keys configured. Everything still works on this device without an account.">
        <Link href="/" className={`${primaryButton} mt-6 block text-center`}>
          Continue to FitMate
        </Link>
      </Notice>
    );
  }

  async function run(kind, fn) {
    setError("");
    setBusy(kind);
    try {
      const { error } = await fn();
      if (error) setError(friendlyAuthError(error));
      return !error;
    } catch (err) {
      setError(friendlyAuthError(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (mode === "signin") {
      await run("password", () => supabase.auth.signInWithPassword({ email, password }));
      return;
    }
    // The server creates the account already confirmed (no verification email), then we sign in.
    await run("password", async () => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName: name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: { code: body.code, message: body.error } };
      }
      return supabase.auth.signInWithPassword({ email, password });
    });
  }

  async function sendReset() {
    if (!email) return setError("Enter your email above, then tap Forgot password.");
    const ok = await run("reset", () => supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirect("/reset-password") }));
    if (ok) setSent({ kind: "reset", email });
  }

  if (sent) {
    const copy = ["Reset your password", "We sent a password reset link to"];
    return (
      <Notice title={copy[0]} text={<>{copy[1]} <b className="text-neutral-900 dark:text-neutral-100">{sent.email}</b>. Open it on this device and browser to finish.</>}>
        <p className="mt-3 text-sm text-neutral-500">Not there? Check spam, or wait a minute before trying again.</p>
        <button type="button" onClick={() => setSent(null)} className="mt-6 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          ← Use a different email
        </button>
      </Notice>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {mode === "signin" ? "Sign in to back up your plans and history." : "Free forever. Your data stays usable offline."}
      </p>

      <Segmented
        options={MODES}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError("");
        }}
        className="mt-6 w-full [&>button]:flex-1 [&>button]:py-2 [&>button]:text-sm"
      />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className={labelClass}>
              Name <span className="font-normal">(optional)</span>
            </label>
            <input id="name" className={inputClass} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            {mode === "signin" && (
              <button type="button" onClick={sendReset} disabled={!!busy} className="mb-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {busy === "reset" ? "Sending…" : "Forgot password?"}
              </button>
            )}
          </div>
          <PasswordInput
            id="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <button type="submit" disabled={!!busy} className={`${primaryButton} w-full`}>
          {busy === "password" ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-500">
        <Link href="/" className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100">
          ← Back to the FitMate website
        </Link>
      </p>
    </div>
  );
}

function Notice({ title, text, children }) {
  return (
    <div className="animate-fade-up">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
        </svg>
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">{text}</p>
      {children}
    </div>
  );
}
