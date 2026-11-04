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

// Copy in the spirit of Duolingo: short, confident, a little cheeky, always about *their* streak
// and *their* plan. No emojis. Each kind has a few versions that rotate by day.

const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function workoutReminder(p, plan, streak, today, withMeal = false) {
  const name = firstName(p);
  const w = plan.workout;
  const facts = [plan.exercises ? plural(plan.exercises, "exercise") : null, plan.minutes ? `about ${plan.minutes} minutes` : null].filter(Boolean).join(", ");
  const first = plan.first ? `${plan.first} first.` : "";
  const [title, body] = pick(
    [
      [`${w} is ready when you are`, `${facts ? `${facts}. ` : ""}${first}`.trim() || "Your plan for today is set. All you have to do is show up."],
      [`Today: ${w}`, streak > 0 ? `Day ${streak + 1} of your streak starts with ${plan.first ?? "the first set"}.` : `${facts ? `${facts}. ` : ""}Show up and the rest takes care of itself.`],
      [`${name ? `${name}, your` : "Your"} ${lower(w)} won't do itself`, `${facts || "It's on the plan"}. You already decided to do this. Now just follow through.`],
      [`Plan says: ${w}`, `${facts ? `${facts}. ` : ""}Start with one set. Momentum does the rest.`],
    ],
    `${today.date}workout`,
  );
  const meal = withMeal && plan.firstMeal ? ` ${plan.firstMeal.slot || "First meal"}: ${plan.firstMeal.name}.` : "";
  return {
    kind: "workout",
    title,
    body: `${body}${meal}`,
    url: "/workout",
    image: image({ k: "workout", t: w, s: facts, n: String(streak) }),
    actions: [
      { action: "open", title: "Start workout" },
      { action: "snooze", title: "Remind me in 1 hour" },
    ],
  };
}

function streakEvening(p, streak, freezes, today) {
  const name = firstName(p);
  const plan = p.plan_week?.[today.weekday];
  const what = plan?.workout ? `${plan.workout}${plan.meals ? " and today's meals" : ""}` : "today's meals";
  const freezeLine = freezes > 0 ? ` You have ${freezes === 1 ? "a freeze" : `${freezes} freezes`} saved, but you earned ${freezes === 1 ? "it" : "them"} the hard way.` : "";
  const [title, body] = pick(
    [
      [`Your ${streak}-day streak needs you`, `Only ${what} ${what.includes("meals") ? "stand" : "stands"} between you and day ${streak + 1}.${freezeLine}`],
      [`${streak} days. Don't make it 0.`, `Follow today's plan before midnight to keep it going.${freezeLine}`],
      [`Still on for today${name ? `, ${name}` : ""}?`, `Your ${streak}-day streak is waiting on ${what}.`],
      [`Day ${streak + 1} is still up for grabs`, `${what.charAt(0).toUpperCase() + what.slice(1)}, then you're done for the day.${freezeLine}`],
    ],
    `${today.date}evening`,
  );
  return {
    kind: "streak_evening",
    title,
    body,
    url: "/home",
    image: image({ k: "streak", n: String(streak), f: String(freezes) }),
    actions: [
      { action: "open", title: "Keep my streak" },
      { action: "snooze", title: "Remind me in 1 hour" },
    ],
  };
}

function streakLastCall(p, streak, freezes, today) {
  const left = 24 * 60 - today.minutes;
  const time = left >= 60 ? `${Math.floor(left / 60)}h ${left % 60 ? `${left % 60}m` : ""}`.trim() : `${left} minutes`;
  const [title, body] = pick(
    freezes > 0
      ? [
          [`${time} left on your ${streak}-day streak`, "Miss today and a freeze will cover it. Better not to need it."],
          [`Last call for your ${streak}-day streak`, `It ends at midnight. A freeze is standing by, but it's no substitute for showing up.`],
        ]
      : [
          [`${time} left on your ${streak}-day streak`, "No freezes left. If today slips, the streak goes with it."],
          [`Last call for your ${streak}-day streak`, "It resets at midnight. A short session still counts if you follow the plan."],
          [`This is the one that counts`, `${streak} days, gone at midnight unless you follow today's plan.`],
        ],
    `${today.date}last`,
  );
  return {
    kind: "streak_last",
    title,
    body,
    url: "/home",
    image: image({ k: "last", n: String(streak), f: String(freezes), m: time }),
    requireInteraction: true,
    actions: [{ action: "open", title: "Save my streak" }],
  };
}

// 8 am: today's plan at a glance, so the day starts on track (breakfast first, workout later).
function morningPlan(p, plan, streak, today) {
  const name = firstName(p);
  const meal = plan.firstMeal ? `${plan.firstMeal.name}${plan.firstMeal.slot ? ` for ${plan.firstMeal.slot.toLowerCase()}` : ""}` : null;
  const w = plan.workout;
  const day = streak + 1;
  const todayLine = [meal ? `Start with ${meal}` : null, w ? `${meal ? "then" : "Then"} ${w} later` : null].filter(Boolean).join(", ");
  const variants = w
    ? [
        [streak > 0 ? `Day ${day} starts now` : "Start a streak today", `${todayLine}. Follow the plan and the streak takes care of itself.`],
        [`Good morning${name ? `, ${name}` : ""}`, `Today: ${meal ?? "your meals"}, then ${w}.${streak > 0 ? ` Day ${day} is yours to take.` : ""}`],
        [`Here's your day`, `${plan.meals ? `${plural(plan.meals, "meal")} and ${w}. ` : `${w}. `}${meal ? `First up: ${meal}.` : "Set the tone early."}`],
      ]
    : [
        [streak > 0 ? `Day ${day} starts at breakfast` : "Start a streak today", `No workout today, just your meals.${meal ? ` First up: ${meal}.` : ""}`],
        [`Good morning${name ? `, ${name}` : ""}`, `Rest day for training, not for the plan.${meal ? ` Start with ${meal}.` : ""}`],
      ];
  const [title, body] = pick(variants, `${today.date}morning`);
  return {
    kind: "morning",
    title,
    body,
    url: "/home",
    image: image(w ? { k: "workout", t: w, s: plan.meals ? `${plural(plan.meals, "meal")} today` : "", n: String(streak) } : { k: "streak", n: String(streak), f: "" }),
    actions: [{ action: "open", title: "See today" }],
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
  return out.map((r) => ({ ...r, day: today.date }));
}
