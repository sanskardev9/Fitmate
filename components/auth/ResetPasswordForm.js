"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { primaryButton, labelClass } from "@/components/common/ui";
import PasswordInput from "./PasswordInput";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "@/lib/toast";

const field = "h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-4 text-base outline-none focus:border-emerald-500 dark:border-neutral-700";

// Password reset with a 6-digit code sent by email (FitMate's own flow, no reset links).
// 1) enter the code -> verified, 2) then choose the new password, 3) a popup says if it worked.
export default function ResetPasswordForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState("sending");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [result, setResult] = useState(null); // { ok, message } popup
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
      toast.info(`Code sent to ${to}`);
      setStep("code");
      setCooldown(60);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (err) {
      toast.error(err.message);
      setStep("code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e, entered = digits.join("")) {
    e?.preventDefault();
    if (entered.length !== 6) return toast.error("Enter all 6 digits.");
    setBusy(true);
    setError("");
    try {
      await post("/api/auth/reset/verify", { email, code: entered, checkOnly: true });
      toast.clear();
      toast.success("Code verified");
      setStep("password");
    } catch (err) {
      toast.error(err.message);
      setDigits(Array(6).fill(""));
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (password.length < 6) return setError("Use at least 6 characters.");
    if (password !== confirmPw) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      await post("/api/auth/reset/verify", { email, code: digits.join(""), password });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setResult({ ok: true, message: signInError && !user ? "Sign in with your new password." : "You're signed in with your new password." });
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setBusy(false);
    }
  }

  function closeResult() {
    if (result?.ok) return router.replace(user ? "/profile" : "/home");
    // Failed: the code may be gone (expired or used up), so start over with a fresh one.
    setResult(null);
    setPassword("");
    setConfirmPw("");
    setDigits(Array(6).fill(""));
    setStep("code");
  }

  function typeDigit(i, value) {
    const v = value.replace(/\D/g, "");
    if (v.length > 1) {
      // Pasted the whole code.
      const next = v.slice(0, 6).split("");
      setDigits([...next, ...Array(6 - next.length).fill("")]);
      boxes.current[Math.min(next.length, 5)]?.focus();
      if (next.length === 6) verify(null, next.join(""));
      return;
    }
    const next = digits.map((x, j) => (j === i ? v : x));
    setDigits(next);
    if (v && i < 5) boxes.current[i + 1]?.focus();
    if (next.join("").length === 6) verify(null, next.join(""));
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

  const popup = result && (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-5 backdrop-blur-md">
      <div role="alertdialog" aria-label={result.ok ? "Password changed" : "Password not changed"} className="animate-fade-up relative w-full max-w-sm overflow-hidden rounded-3xl bg-[var(--background)] p-7 text-center shadow-2xl ring-1 ring-black/5 [animation-duration:220ms] dark:ring-white/10">
        <div className={`pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl ${result.ok ? "bg-emerald-500/25" : "bg-rose-500/25"}`} />
        <div className="relative mx-auto h-20 w-20">
          <span className={`ring-out absolute inset-0 rounded-full ${result.ok ? "bg-emerald-500/40" : "bg-rose-500/40"}`} />
          <span className={`pop-in relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ${result.ok ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/40" : "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/40"}`}>
            {result.ok ? (
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="animate-draw [animation-delay:150ms]" style={{ strokeDasharray: 1 }} />
              </svg>
            ) : (
              <XCircle className="h-10 w-10" />
            )}
          </span>
        </div>
        <h2 className="relative mt-5 text-xl font-semibold">{result.ok ? "Password changed" : "Couldn't change password"}</h2>
        <p className="relative mt-1.5 text-sm text-neutral-500">{result.message}</p>
        <button type="button" onClick={closeResult} className={`relative mt-6 w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-colors ${result.ok ? "bg-emerald-600 hover:bg-emerald-700" : "bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"}`}>
          {result.ok ? "Continue" : "Try again"}
        </button>
      </div>
    </div>
  );

  if (step === "password") {
    return (
      <form onSubmit={savePassword} className="animate-fade-up">
        {popup}
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">For {email}.</p>

        <label className={`${labelClass} mt-6 block`}>New password</label>
        <PasswordInput value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="At least 6 characters" autoComplete="new-password" autoFocus />
        <label className={`${labelClass} mt-4 block`}>Confirm new password</label>
        <PasswordInput value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); setError(""); }} placeholder="Type it again" autoComplete="new-password" />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={`${primaryButton} mt-5 w-full disabled:opacity-50`}>
          {busy ? "Saving…" : "Change password"}
        </button>
        <Link href={user ? "/profile" : "/login"} className="mt-5 block text-center text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          Cancel
        </Link>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="animate-fade-up">
      {popup}
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryButton} mt-5 w-full disabled:opacity-50`}>
        {busy ? "Checking…" : "Verify code"}
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
