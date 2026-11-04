import "server-only";

// Duolingo-style reminders, worked out from the streak summary each device reports.
// Times are the user's local time; the streak ends at local midnight.
export const MORNING = 8 * 60; // 8:00 am
export const STREAK_EVENING = 20 * 60; // 8:00 pm
export const STREAK_LAST_CALL = 22 * 60 + 30; // 10:30 pm
const WINDOW = 60; // a reminder can go out up to an hour late (the job runs every 15 min)

export function localNow(timeZone, at = new Date()) {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "Asia/Kolkata";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday) };
}

const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const isPlanned = (week, weekday) => {
  const p = week?.[weekday];
  return Boolean(p && (p.workout || p.meals));
};

// Streak as of today, from a summary that may be a few days old (the user hasn't opened the app).
// Missed planned days in between use up freezes first, exactly like on the device.
export function estimateStreak(p, today) {
  if (!p.streak_day || !p.streak_current) return { streak: 0, freezes: p.streak_freezes ?? 0 };
  if (p.streak_day === today.date) return { streak: p.streak_current, freezes: p.streak_freezes ?? 0 };
  let missed = 0;
  let day = p.streak_day;
  if (p.streak_today === "pending") missed++;
  for (let i = 0; i < 14; i++) {
    day = addDays(day, 1);
    if (day >= today.date) break;
    const wd = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (isPlanned(p.plan_week, wd)) missed++;
  }
  const freezes = p.streak_freezes ?? 0;
  return missed > freezes ? { streak: 0, freezes } : { streak: p.streak_current, freezes: freezes - missed };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Same day + same kind -> same wording (retries match); different days rotate through variants.
const pick = (list, seed) => list[[...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % list.length];

// Rich picture for Android / Windows (macOS and iOS ignore it).
const image = (q) => `/api/push/image?${new URLSearchParams(q).toString()}`;

// Copy in the spirit of Duolingo: a punchy title and ONE short line (aim for under ~45 characters),
// always about *their* streak and *their* plan. No emojis, no app name. Variants rotate by day.

function workoutReminder(p, plan, streak, today, withMeal = false) {
  const name = firstName(p);
  const w = plan.workout;
  const len = plan.minutes ? `${plan.minutes} min` : plan.exercises ? plural(plan.exercises, "move") : null;
  const variants = [
    [`${w} time`, len ? `${len}. You've got this.` : "You've got this."],
    [`${w} won't do itself`, "Neither will day " + (streak + 1) + "."],
    [name ? `Ready, ${name}?` : "Ready?", `${w} is on.${len ? ` ${len}.` : ""}`],
    [`Today: ${w}`, plan.first ? `First up: ${plan.first}.` : "One set at a time."],
  ];
  if (streak > 0) variants.push([`Day ${streak + 1} needs ${w}`, "Show up. That's the whole trick."]);
  let [title, body] = pick(variants, `${today.date}workout`);
  if (withMeal && plan.firstMeal) body = `${plan.firstMeal.name} first, then train.`;
  return {
    kind: "workout",
    title,
    body,
    url: "/workout",
    image: image({ k: "workout", t: w, s: len ?? "", n: String(streak) }),
    actions: [
      { action: "open", title: "Start" },
      { action: "snooze", title: "In 1 hour" },
    ],
  };
}

function streakEvening(p, streak, freezes, today) {
  const name = firstName(p);
  const plan = p.plan_week?.[today.weekday];
  const what = plan?.workout ?? "Your meals";
  const variants = [
    [`${streak} days. Don't make it 0.`, `${what} ${plan?.workout ? "is" : "are"} still waiting.`],
    [`Your ${streak}-day streak misses you`, "A few minutes keeps it alive."],
    [name ? `Still in, ${name}?` : "Still in?", `Day ${streak + 1} is up for grabs.`],
    ["Don't break the chain", `${streak} days and counting. Make it ${streak + 1}.`],
  ];
  if (freezes > 0) variants.push(["A freeze won't fix this", `Well, it would. But you're better than that.`]);
  const [title, body] = pick(variants, `${today.date}evening`);
  return {
    kind: "streak_evening",
    title,
    body,
    url: "/home",
    image: image({ k: "streak", n: String(streak), f: String(freezes) }),
    actions: [
      { action: "open", title: "Keep it" },
      { action: "snooze", title: "In 1 hour" },
    ],
  };
}

function streakLastCall(p, streak, freezes, today) {
  const left = 24 * 60 - today.minutes;
  const time = left >= 60 ? `${Math.floor(left / 60)}h ${left % 60 ? `${left % 60}m` : ""}`.trim() : `${left} min`;
  const variants =
    freezes > 0
      ? [
          [`${time} left`, `Your ${streak}-day streak ends at midnight.`],
          ["Last call", `A freeze is on standby. Don't make it work.`],
        ]
      : [
          [`${time} left`, `Your ${streak}-day streak ends at midnight.`],
          ["Last call", `No freezes left. ${streak} days on the line.`],
          [`Save your ${streak}-day streak`, "Midnight is coming. So is day 0."],
        ];
  const [title, body] = pick(variants, `${today.date}last`);
  return {
    kind: "streak_last",
    title,
    body,
    url: "/home",
    image: image({ k: "last", n: String(streak), f: String(freezes), m: time }),
    requireInteraction: true,
    actions: [{ action: "open", title: "Save it" }],
  };
}

// 8 am: the day at a glance, so it starts on track.
function morningPlan(p, plan, streak, today) {
  const name = firstName(p);
  const meal = plan.firstMeal?.name ?? null;
  const w = plan.workout;
  const variants = w
    ? [
        [streak > 0 ? `Day ${streak + 1} starts now` : "Day 1 starts now", meal ? `${meal}, then ${w}.` : `${w} is on today.`],
        [name ? `Morning, ${name}` : "Morning", meal ? `Breakfast is ${meal}. Easy start.` : `${w} is on today.`],
        ["Today's plan is ready", `${meal ? `${meal} first. ` : ""}${w} later.`],
      ]
    : [
        [streak > 0 ? `Day ${streak + 1} starts at breakfast` : "Day 1 starts at breakfast", meal ? `${meal}. Then rest.` : "Meals only today."],
        [name ? `Morning, ${name}` : "Morning", "Rest day for muscles, not for the plan."],
      ];
  const [title, body] = pick(variants, `${today.date}morning`);
  return {
    kind: "morning",
    title,
    body,
    url: "/home",
    image: image(w ? { k: "workout", t: w, s: meal ? `${meal} first` : "", n: String(streak) } : { k: "streak", n: String(streak), f: "" }),
    actions: [{ action: "open", title: "See today" }],
  };
}

// Meal nudges, Zomato-style: a short, food-first question and one playful line. Sent ~45 min after
// the meal's time (the plan's own time, or a default per slot) if that meal isn't logged yet.
const SLOT_TIME = { breakfast: 8 * 60 + 30, lunch: 13 * 60 + 30, snack: 17 * 60, dinner: 20 * 60 + 30 };
const MEAL_DELAY = 45;

function parseTime(text) {
  const m = String(text ?? "").match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (!ap && !m[2]) return null; // a bare number ("2 eggs") isn't a time
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export function mealTime(slot) {
  return parseTime(slot.time) ?? SLOT_TIME[String(slot.slot).toLowerCase()] ?? null;
}

const MEAL_COPY = {
  breakfast: (d, n) => [
    ["Breakfast?", `${d} is waiting. Log it in one tap.`],
    ["Did breakfast happen?", "If yes, tap to log it. If no, go."],
    [`${d}, anyone?`, "Best way to start day " + n + "."],
  ],
  lunch: (d, n) => [
    ["Lunch o'clock", `${d} is on the menu. Tap to log.`],
    ["What's for lunch?", `We know. It's ${d}.`],
    [`${d} called`, "It says log me. Your streak agrees."],
  ],
  snack: (d) => [
    ["Snack check", `${d}. Small bite, big streak.`],
    ["4 pm hunger is real", `${d} fixes that. Tap to log.`],
  ],
  dinner: (d, n) => [
    ["Dinner plans?", `${d}. Log it, lock in day ${n}.`],
    [`${d} > midnight cravings`, "Tap to log dinner."],
    ["Last meal of the day", `${d} and you're done.`],
  ],
};

function mealReminder(p, slot, streak, today) {
  const key = String(slot.slot).toLowerCase();
  const dish = slot.name || "Your meal";
  const pool = (MEAL_COPY[key] ?? ((d) => [[`${slot.slot}?`, `${d} is waiting. Tap to log.`]]))(dish, streak + 1);
  const [title, body] = pick(pool, `${today.date}${key}`);
  return {
    kind: `meal_${key.replace(/[^a-z]/g, "") || "meal"}`,
    title,
    body,
    url: "/diet",
    actions: [
      { action: "open", title: "Log it" },
      { action: "snooze", title: "In 1 hour" },
    ],
  };
}

const firstName = (p) => (p.full_name ?? "").trim().split(/\s+/)[0] || "";

// The reminders due for one user right now (usually none).
export function dueReminders(p, at = new Date()) {
  const today = localNow(p.timezone, at);
  const due = (minute) => today.minutes >= minute && today.minutes < minute + WINDOW;
  const plan = p.plan_week?.[today.weekday];
  const planned = isPlanned(p.plan_week, today.weekday);
  const doneToday = p.streak_day === today.date && p.streak_today === "done";
  const { streak, freezes } = estimateStreak(p, today);
  const out = [];

  const [h, m] = String(p.notify_workout_time ?? "07:00").split(":").map(Number);
  const workoutAt = h * 60 + (m || 0);
  const workoutOn = Boolean(p.notify_workout && plan?.workout);
  // A workout reminder set for 7 to 9 am doubles as the morning plan, so only one message goes out.
  const workoutIsMorning = workoutOn && Math.abs(workoutAt - MORNING) <= 60;

  if (p.notify_morning !== false && planned && !doneToday && !workoutIsMorning && due(MORNING)) out.push(morningPlan(p, plan, streak, today));
  if (workoutOn && !doneToday && due(workoutAt)) out.push(workoutReminder(p, plan, streak, today, workoutIsMorning && p.notify_morning !== false));
  if (p.notify_streak && streak > 0 && planned && !doneToday) {
    if (due(STREAK_EVENING)) out.push(streakEvening(p, streak, freezes, today));
    else if (due(STREAK_LAST_CALL)) out.push(streakLastCall(p, streak, freezes, today));
  }

  // Meals not logged ~45 min after their time. Never on top of another reminder in the same run.
  if (p.notify_meals !== false && !doneToday && !out.length) {
    const logged = new Set(p.today_log?.day === today.date ? (p.today_log.slots ?? []).map((x) => String(x).toLowerCase()) : []);
    for (const slot of plan?.slots ?? []) {
      const at = mealTime(slot);
      if (at == null || logged.has(String(slot.slot).toLowerCase())) continue;
      if (due(at + MEAL_DELAY)) {
        out.push(mealReminder(p, slot, streak, today));
        break; // one meal nudge at a time
      }
    }
  }
  return out.map((r) => ({ ...r, day: today.date }));
}
