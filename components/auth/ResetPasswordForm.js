"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { primaryButton, labelClass } from "@/components/common/ui";
import PasswordInput from "./PasswordInput";

const field = "h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-4 text-base outline-none focus:border-emerald-500 dark:border-neutral-700";

// Password reset with a 6-digit code sent by email (FitMate's own flow, no reset links).
export default function ResetPasswordForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState("sending");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const boxes = useRef([]);

  // Email comes from the sign-in page, or the signed-in account. Sent once on arrival.
  const started = useRef(false);
  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;
    const e = user?.email || new URLSearchParams(window.location.search).get("email") || "";
    setEmail(e);
    if (e) sendCode(null, e);
    else setStep("missing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function post(path, body) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Something went wrong. Try again.");
    return json;
  }

  async function sendCode(e, to = email) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post("/api/auth/reset/send", { email: to });
      setInfo(r.message);
      setStep("code");
      setCooldown(60);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.message);
      setStep("code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) return setError("Enter all 6 digits.");
    setBusy(true);
    setError("");
    try {
      await post("/api/auth/reset/verify", { email, code, password });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError && !user) return router.replace("/login");
      router.replace(user ? "/profile" : "/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function typeDigit(i, value) {
    const v = value.replace(/\D/g, "");
    if (v.length > 1) {
      // Pasted the whole code.
      const next = v.slice(0, 6).split("");
      setDigits([...next, ...Array(6 - next.length).fill("")]);
      boxes.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, j) => (j === i ? v : x)));
    if (v && i < 5) boxes.current[i + 1]?.focus();
  }

  if (step === "missing") {
    return (
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">Type the email you signed up with on the sign-in page, then tap Forgot password.</p>
        <Link href="/login" className={`${primaryButton} mt-6 block text-center`}>
          Back to sign in
        </Link>
      </div>
    );
  }
  if (step === "sending") {
    return (
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight">Sending your code…</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">To {email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={verify} className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Enter your code</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        {info || "We sent a 6-digit code to"} <span className="font-medium text-neutral-900 dark:text-neutral-100">{email}</span>
      </p>

      <div className="mt-6 grid grid-cols-6 gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (boxes.current[i] = el)}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => typeDigit(i, e.target.value)}
            onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && boxes.current[i - 1]?.focus()}
            className="h-14 w-full rounded-xl border border-neutral-300 bg-transparent text-center text-2xl font-semibold tabular-nums outline-none focus:border-emerald-500 dark:border-neutral-700"
          />
        ))}
      </div>

      <label className={`${labelClass} mt-6 block`}>New password</label>
      <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryButton} mt-5 w-full disabled:opacity-50`}>
        {busy ? "Saving…" : "Reset password & sign in"}
      </button>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link href={user ? "/profile" : "/login"} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          {user ? "Cancel" : "Back to sign in"}
        </Link>
        <button type="button" disabled={cooldown > 0 || busy} onClick={sendCode} className="font-medium text-emerald-600 disabled:text-neutral-400 dark:text-emerald-400">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
