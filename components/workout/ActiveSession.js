"use client";

import { Fragment, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { isMain, SECTION_LABEL } from "@/lib/workout/sections";
import { X, Timer, Check, Play, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { getPreferences } from "@/lib/services/preferencesService";
import { getDaysForPlan, getDayForWeekday } from "@/lib/services/workoutService";
import { startSession, getActiveSession, getSessionSets, logSet, deleteSet, finishSession, discardSession, lastPerformance } from "@/lib/services/sessionService";
import { startRest, skipRest, unlockAudio, getAutoRest, restAlert, getRest, subscribeRest } from "@/lib/workout/restTimer";
import { formatDuration, WEEKDAYS } from "@/lib/utils";
import RestTimerBar from "./RestTimerBar";
import { useConfirm } from "@/components/common/ConfirmDialog";
import TimerPicker from "./TimerPicker";
import { LogoMark } from "@/components/common/Logo";

const holdLabel = (ex) => (ex.type === "hold" ? "Sec" : "Reps");
const targetOf = (ex) => (ex.type === "hold" ? ex.holdSec : ex.reps);

// Full-screen workout mode: only the session, its sets, one big "log next set" button and the rest timer.
export default function ActiveSession() {
  const router = useRouter();
  const confirm = useConfirm();
  const [session, setSession] = useState(null);
  const [choices, setChoices] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [layout, setLayout] = useState({}); // exerciseId -> { extra, removed }
  const [drafts, setDrafts] = useState({}); // "exerciseId:set" -> { value, weight }
  const [timing, setTiming] = useState(null); // { exIndex, n, idx } for the hold stopwatch
  const rest = useSyncExternalStore(subscribeRest, getRest, () => null);
  const [, setClock] = useState(0);

  useEffect(() => {
    (async () => {
      const active = await getActiveSession();
      if (active) return setSession(active);
      const dayId = new URLSearchParams(window.location.search).get("day");
      const day = dayId ? await db.trainingDays.get(dayId) : null;
      if (day) return setSession(await startSession(day));
      const prefs = await getPreferences();
      if (!prefs.activeWorkoutPlanId) return setChoices([]);
      const today = await getDayForWeekday(prefs.activeWorkoutPlanId, new Date().getDay());
      const days = await getDaysForPlan(prefs.activeWorkoutPlanId);
      setChoices(today ? [today, ...days.filter((d) => d.id !== today.id)] : days);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const setsRaw = useLiveQuery(() => (session ? getSessionSets(session.id) : []), [session?.id]);
  const sets = useMemo(() => setsRaw ?? [], [setsRaw]);
  const last = useLiveQuery(async () => {
    if (!session) return {};
    const entries = await Promise.all(session.plan.map(async (e) => [e.name, await lastPerformance(e.name, session.id)]));
    return Object.fromEntries(entries);
  }, [session?.id]);

  const setsByExercise = useMemo(() => {
    const m = {};
    for (const s of sets) (m[s.exerciseId] ??= []).push(s);
    return m;
  }, [sets]);

  if (choices) return <DayPicker days={choices} onPick={async (d) => { setChoices(null); setSession(await startSession(d)); }} />;
  if (!session) return <Loading />;

  const doneMap = (ex) => Object.fromEntries((setsByExercise[ex.exerciseId] ?? []).map((s) => [s.setNumber, s]));
  // Set numbers shown for an exercise: plan sets + logged beyond them + added, minus removed (logged ones always stay).
  function rowsFor(ex) {
    const done = doneMap(ex);
    const maxDone = Object.keys(done).reduce((m, n) => Math.max(m, Number(n)), 0);
    const { extra = 0, removed = [] } = layout[ex.exerciseId] ?? {};
    const total = Math.max(ex.sets, maxDone) + extra;
    return Array.from({ length: total }, (_, i) => i + 1).filter((n) => !removed.includes(n) || done[n]);
  }
  function draftFor(ex, n, idx) {
    const saved = drafts[`${ex.exerciseId}:${n}`];
    if (saved) return saved;
    const prev = last?.[ex.name]?.sets?.[idx];
    const prevValue = prev ? (ex.type === "hold" ? prev.holdSec : prev.reps) : null;
    return { value: String(prevValue ?? targetOf(ex) ?? ""), weight: String(prev?.weight ?? ex.weight ?? "") };
  }
  const setDraft = (ex, n, patch, idx) => setDrafts((d) => ({ ...d, [`${ex.exerciseId}:${n}`]: { ...draftFor(ex, n, idx), ...patch } }));
  const updateLayout = (ex, fn) => setLayout((l) => ({ ...l, [ex.exerciseId]: fn(l[ex.exerciseId] ?? { extra: 0, removed: [] }) }));

  // The next set to do, in plan order, optionally treating one just-logged set as done.
  function nextSet(justLogged) {
    for (let exIndex = 0; exIndex < session.plan.length; exIndex++) {
      const ex = session.plan[exIndex];
      const done = doneMap(ex);
      const rows = rowsFor(ex);
      for (let idx = 0; idx < rows.length; idx++) {
        const n = rows[idx];
        if (done[n] || (justLogged && justLogged.exerciseId === ex.exerciseId && justLogged.n === n)) continue;
        return { exIndex, ex, n, idx };
      }
    }
    return null;
  }

  const scrollToRow = (exerciseId, n) =>
    requestAnimationFrame(() => document.querySelector(`[data-row="${exerciseId}:${n}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));

  async function logRow(exIndex, n, idx, override) {
    const ex = session.plan[exIndex];
    const draft = draftFor(ex, n, idx);
    const v = Number(override ?? draft.value);
    if (!v) return;
    unlockAudio();
    await logSet(session, ex, { setNumber: n, reps: ex.type === "hold" ? null : v, holdSec: ex.type === "hold" ? v : null, weight: Number(draft.weight) || null });
    const next = nextSet({ exerciseId: ex.exerciseId, n });
    restNext.current = next ? `${next.ex.name} · set ${next.idx + 1}` : null;
    if (next && (await getAutoRest())) startRest(ex.restSec, `${ex.name} set ${idx + 1}`);
    else skipRest();
    if (next) scrollToRow(next.ex.exerciseId, next.n);
  }

  async function undoRow(set, label) {
    const ok = await confirm({ title: `Undo set ${label}?`, message: `${set.exerciseName}: ${set.holdSec ? `${set.holdSec}s` : `${set.reps} reps`}${set.weight ? ` × ${set.weight}` : ""} will be removed from this workout.`, confirmLabel: "Undo set", tone: "warn" });
    if (ok) await deleteSet(set.id);
  }

  // Warm-up and cool-down don't count toward the workout's sets.
  const mainIds = new Set(session.plan.filter(isMain).map((e) => e.exerciseId));
  const planned = session.plan.filter(isMain).reduce((n, e) => n + rowsFor(e).length, 0);
  const mainDone = sets.filter((x) => mainIds.has(x.exerciseId)).length;
  const pct = planned ? Math.min(100, Math.round((mainDone / planned) * 100)) : 0;
  const next = nextSet();
  const timingEx = timing ? session.plan[timing.exIndex] : null;

  return (
    <div className="min-h-dvh bg-[var(--background)] pb-48">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[var(--background)]/90 backdrop-blur-xl dark:border-neutral-800">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <button type="button" onClick={() => router.push("/workout")} aria-label="Leave workout (it stays open)" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{session.dayName}</p>
            <p className="text-xs text-neutral-500 tabular-nums">
              {formatDuration((Date.now() - session.startedAt) / 1000)} · {mainDone}/{planned} sets
            </p>
          </div>
          <button type="button" onClick={() => setTimerOpen(true)} aria-label="Start a timer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-300">
            <Timer className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setFinishing(true)} className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">
            Finish
          </button>
        </div>
        <div className="h-1 bg-neutral-200 dark:bg-neutral-800">
          <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-5">
        {session.plan.map((ex, exIndex) => {
          const done = doneMap(ex);
          const rows = rowsFor(ex);
          const target = targetOf(ex);
          const complete = rows.every((n) => done[n]);
          const lastOpen = [...rows].reverse().find((n) => !done[n]);
          const section = ex.section ?? "main";
          const newSection = exIndex === 0 || (session.plan[exIndex - 1].section ?? "main") !== section;
          return (
            <Fragment key={ex.exerciseId}>
            {newSection && (
              <p className={`flex items-center gap-2 pt-2 text-xs font-semibold tracking-wide uppercase ${section === "main" ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"}`}>
                {SECTION_LABEL[section]}
                {section !== "main" && <span className="font-normal tracking-normal normal-case text-neutral-500">· not counted in your sets</span>}
                <span className="h-px flex-1 bg-current opacity-20" />
              </p>
            )}
            <section className={`overflow-hidden rounded-2xl border transition-colors ${section === "main" ? "bg-white dark:bg-neutral-900" : "bg-sky-500/5"} ${complete ? "border-emerald-500/50" : section === "main" ? "border-neutral-200 dark:border-neutral-800" : "border-sky-500/20"}`}>
              <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div className="min-w-0">
                  <h2 className="font-semibold">{ex.name}</h2>
                  <p className="text-xs text-neutral-500">
                    {ex.sets} × {target ?? "–"}
                    {ex.type === "hold" ? "s hold" : " reps"}
                    {ex.weight ? ` @ ${ex.weight} ${ex.weightUnit}` : ""} · rest {formatDuration(ex.restSec)}
                  </p>
                  {ex.notes && <p className="mt-1 text-xs text-neutral-400 italic">{ex.notes}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${complete ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>
                  {Object.keys(done).length}/{rows.length}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-[2.75rem_1fr_4.5rem_4.5rem_3.25rem] items-center gap-2 px-3 pb-1 text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
                <span className="pl-1">Set</span>
                <span>Last</span>
                <span className="text-center">{holdLabel(ex)}</span>
                <span className="text-center">{ex.weightUnit}</span>
                <span />
              </div>
              <div className="space-y-1 px-1 pb-2">
                {rows.map((n, idx) => {
                  const logged = done[n];
                  const prev = last?.[ex.name]?.sets?.[idx];
                  const draft = draftFor(ex, n, idx);
                  const isNext = next && next.ex.exerciseId === ex.exerciseId && next.n === n;
                  return (
                    <SetRow
                      key={n}
                      rowId={`${ex.exerciseId}:${n}`}
                      label={idx + 1}
                      ex={ex}
                      prevText={prev ? `${ex.type === "hold" ? `${prev.holdSec}s` : prev.reps}${prev.weight ? ` × ${prev.weight}` : ""}` : "–"}
                      draft={draft}
                      logged={logged}
                      isNext={isNext}
                      onDraft={(patch) => setDraft(ex, n, patch, idx)}
                      onLog={() => logRow(exIndex, n, idx)}
                      onUndo={() => undoRow(logged, idx + 1)}
                      onTime={() => setTiming({ exIndex, n, idx })}
                      onRemove={rows.length > 1 ? () => updateLayout(ex, (l) => ({ ...l, removed: [...l.removed, n] })) : null}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 border-t border-neutral-100 text-sm font-medium dark:border-neutral-800">
                <button type="button" disabled={!lastOpen || rows.length <= 1} onClick={() => updateLayout(ex, (l) => ({ ...l, removed: [...l.removed, lastOpen] }))} className="flex items-center justify-center gap-1.5 border-r border-neutral-100 py-3 text-neutral-500 disabled:opacity-30 dark:border-neutral-800">
                  <Minus className="h-4 w-4" /> Remove set
                </button>
                <button type="button" onClick={() => updateLayout(ex, (l) => ({ ...l, extra: l.extra + 1 }))} className="flex items-center justify-center gap-1.5 py-3 text-emerald-600 dark:text-emerald-400">
                  <Plus className="h-4 w-4" /> Add set
                </button>
              </div>
            </section>
            </Fragment>
          );
        })}
        {session.plan.length === 0 && <p className="py-10 text-center text-neutral-500">This day has no exercises. Add some from Plans.</p>}
      </main>

      {!rest && <NextSetBar next={next} draft={next ? draftFor(next.ex, next.n, next.idx) : null} onLog={() => (next.ex.type === "hold" ? setTiming({ exIndex: next.exIndex, n: next.n, idx: next.idx }) : logRow(next.exIndex, next.n, next.idx))} onFinish={() => setFinishing(true)} />}
      <RestTimerBar next={restNext.current} />
      {timerOpen && <TimerPicker onClose={() => setTimerOpen(false)} />}
      {timing && timingEx && (
        <HoldTimer
          title={`${timingEx.name} · set ${timing.idx + 1}`}
          target={targetOf(timingEx)}
          onClose={() => setTiming(null)}
          onUse={(secs) => {
            setDraft(timingEx, timing.n, { value: String(secs) }, timing.idx);
            setTiming(null);
          }}
          onLog={(secs) => {
            const t = timing;
            setDraft(timingEx, t.n, { value: String(secs) }, t.idx);
            setTiming(null);
            logRow(t.exIndex, t.n, t.idx, secs);
          }}
        />
      )}
      {finishing && (
        <FinishSheet
          session={session}
          sets={sets}
          planned={planned}
          onClose={() => setFinishing(false)}
          onSave={async (values) => {
            await finishSession(session.id, values);
            skipRest();
            router.replace("/home");
          }}
          onDiscard={async () => {
            if (!(await confirm({ title: "Discard this workout?", message: "All sets logged in this session will be deleted.", confirmLabel: "Discard", tone: "danger" }))) return;
            await discardSession(session.id);
            skipRest();
            router.replace("/workout");
          }}
        />
      )}
    </div>
  );
}

// Holds the "next" label for the rest timer across renders.
const restNext = { current: null };

// Big thumb-sized action at the bottom: logs the next set with the numbers shown.
function NextSetBar({ next, draft, onLog, onFinish }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-[var(--background)]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-neutral-800">
      <div className="mx-auto max-w-2xl">
        {next ? (
          <>
            <p className="mb-2 truncate text-xs text-neutral-500">
              Next · <span className="font-medium text-neutral-800 dark:text-neutral-200">{next.ex.name}</span> · set {next.idx + 1}
            </p>
            <button type="button" onClick={onLog} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/25 active:scale-[0.99] active:bg-emerald-700">
              {next.ex.type === "hold" ? <Play className="h-5 w-5 fill-current" /> : <Check className="h-6 w-6" strokeWidth={3} />}
              {next.ex.type === "hold" ? `Start ${draft.value || "–"}s hold` : `Log ${draft.value || "–"} reps${draft.weight ? ` × ${draft.weight} ${next.ex.weightUnit}` : ""}`}
            </button>
          </>
        ) : (
          <button type="button" onClick={onFinish} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white">
            <Check className="h-6 w-6" strokeWidth={3} /> All sets logged · Finish
          </button>
        )}
      </div>
    </div>
  );
}

function SetRow({ rowId, label, ex, prevText, draft, logged, isNext, onDraft, onLog, onUndo, onTime, onRemove }) {
  const value = logged ? String((ex.type === "hold" ? logged.holdSec : logged.reps) ?? "") : draft.value;
  const weight = logged ? String(logged.weight ?? "") : draft.weight;
  const field = "h-12 w-full rounded-xl text-center text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div
      data-row={rowId}
      className={`grid scroll-mt-28 grid-cols-[2.75rem_1fr_4.5rem_4.5rem_3.25rem] items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
        logged ? "bg-emerald-500/10" : isNext ? "bg-emerald-500/5 ring-1 ring-emerald-500/40" : ""
      }`}
    >
      <span className="flex items-center gap-0.5">
        <span className={`w-4 text-sm font-semibold tabular-nums ${isNext ? "text-emerald-600" : "text-neutral-500"}`}>{label}</span>
        {!logged && onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove set ${label}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
      <span className="truncate text-sm text-neutral-400 tabular-nums">{prevText}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={value}
          disabled={Boolean(logged)}
          onChange={(e) => onDraft({ value: e.target.value })}
          className={`${field} bg-neutral-100 disabled:bg-transparent dark:bg-neutral-800 dark:disabled:bg-transparent`}
        />
        {ex.type === "hold" && !logged && (
          <button type="button" onClick={onTime} aria-label={`Time set ${label}`} className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
            <Play className="h-3 w-3 fill-current" />
          </button>
        )}
      </div>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        placeholder="–"
        value={weight}
        disabled={Boolean(logged)}
        onChange={(e) => onDraft({ weight: e.target.value })}
        className={`${field} bg-neutral-100 disabled:bg-transparent dark:bg-neutral-800 dark:disabled:bg-transparent`}
      />
      <button
        type="button"
        aria-label={logged ? `Undo set ${label}` : `Log set ${label}`}
        onClick={logged ? onUndo : onLog}
        className={`flex h-12 w-12 items-center justify-center justify-self-end rounded-xl transition-colors ${
          logged ? "bg-emerald-500 text-white" : isNext ? "bg-emerald-600/15 text-emerald-600 ring-1 ring-emerald-500/50" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
        }`}
      >
        <Check className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}

// Stopwatch for a hold: nothing starts until Start is pressed; Pause, Reset, then log the time.
function HoldTimer({ title, target, onClose, onUse, onLog }) {
  const [startAt, setStartAt] = useState(null);
  const [banked, setBanked] = useState(0);
  const [, tick] = useState(0);
  const [beeped, setBeeped] = useState(false);
  const running = startAt != null;
  const ms = banked + (running ? Date.now() - startAt : 0);
  const secs = Math.floor(ms / 1000);
  const pct = target ? Math.min(100, (ms / (target * 1000)) * 100) : 0;
  const reached = target && secs >= target;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick((x) => x + 1), 100);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (reached && running && !beeped) {
      setBeeped(true);
      restAlert();
    }
  }, [reached, running, beeped]);

  function toggle() {
    unlockAudio();
    if (running) {
      setBanked(ms);
      setStartAt(null);
    } else setStartAt(Date.now());
  }

  function reset() {
    setStartAt(null);
    setBanked(0);
    setBeeped(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="animate-fade-up w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center sm:rounded-3xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-left">
          <p className="min-w-0 truncate text-sm font-medium text-neutral-500">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-neutral-400">
            ✕
          </button>
        </div>

        <div className="relative mx-auto mt-6 h-56 w-56">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="7" className="stroke-neutral-100 dark:stroke-neutral-800" />
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - pct} className={reached ? "stroke-emerald-500" : "stroke-sky-500"} />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-6xl font-semibold tabular-nums ${reached ? "text-emerald-500" : ""}`}>{formatDuration(secs)}</span>
            <span className="mt-1 text-xs text-neutral-500">{target ? (reached ? "Target reached" : `Target ${target}s`) : "Hold"}</span>
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={reset} disabled={!ms} className="rounded-2xl border border-neutral-300 py-4 text-base font-semibold disabled:opacity-40 dark:border-neutral-700">
            Reset
          </button>
          <button type="button" onClick={toggle} className={`rounded-2xl py-4 text-base font-semibold text-white ${running ? "bg-amber-500" : "bg-emerald-600"}`}>
            {running ? "Pause" : ms ? "Resume" : "Start"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <button type="button" disabled={!secs} onClick={() => onUse(secs)} className="rounded-xl py-3 font-medium text-neutral-600 disabled:opacity-40 dark:text-neutral-300">
            Use time
          </button>
          <button type="button" disabled={!secs} onClick={() => onLog(secs)} className="rounded-xl bg-neutral-900 py-3 font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900">
            Log set ({secs}s)
          </button>
        </div>
      </div>
    </div>
  );
}

function FinishSheet({ session, sets, planned, onClose, onSave, onDiscard }) {
  const [effort, setEffort] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const reps = sets.reduce((n, s) => n + (s.reps ?? 0), 0);
  const holds = sets.reduce((n, s) => n + (s.holdSec ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="animate-fade-up w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold">Finish {session.dayName}?</h2>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Time" value={`${minutes} min`} />
          <Stat label="Sets" value={`${sets.length}/${planned}`} />
          {reps ? <Stat label="Total reps" value={reps} /> : <Stat label="Hold time" value={formatDuration(holds)} />}
        </div>
        {sets.length < planned && <p className="mt-3 text-sm text-amber-600">{planned - sets.length} planned sets not logged. That&apos;s fine, they&apos;ll show as missed.</p>}
        <p className="mt-5 text-sm font-medium">How hard was it?</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {[
            [3, "Easy"],
            [5, "Okay"],
            [7, "Hard"],
            [9, "Very hard"],
            [10, "Max"],
          ].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setEffort(v)} className={`rounded-lg border py-2 text-xs font-medium ${effort === v ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-300 dark:border-neutral-700"}`}>
              {l}
            </button>
          ))}
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional): shoulder felt tight…" className="mt-4 w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-neutral-700" />
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ effort, notes });
          }}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save workout"}
        </button>
        <div className="mt-3 flex justify-between text-sm">
          <button type="button" onClick={onClose} className="font-medium text-neutral-500">
            Keep training
          </button>
          <button type="button" onClick={onDiscard} className="font-medium text-red-600">
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-neutral-100 py-3 dark:bg-neutral-800">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function DayPicker({ days, onPick }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-5 py-8">
      <Link href="/workout" className="text-sm text-neutral-500">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Which workout?</h1>
      {days.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <p className="text-neutral-600 dark:text-neutral-400">You don&apos;t have a workout plan yet.</p>
          <Link href="/plans/import" className="mt-4 inline-block font-medium text-emerald-600">
            Bring in your plan →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {days.map((d, i) => (
            <li key={d.id}>
              <button type="button" onClick={() => onPick(d)} className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900">
                <span>
                  <span className="block font-semibold">{d.name}</span>
                  <span className="text-sm text-neutral-500">{d.weekdays?.length ? d.weekdays.map((w) => WEEKDAYS[w]).join(", ") : "Any day"}</span>
                </span>
                {i === 0 && new Date().getDay() !== undefined && d.weekdays?.includes(new Date().getDay()) && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Today</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoMark className="h-12 w-12 animate-pulse" />
    </div>
  );
}
