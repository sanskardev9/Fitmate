import "server-only";

// Duolingo-style reminders, worked out from the streak summary each device reports.
// Times are the user's local time; the streak ends at local midnight.
export const MORNING = 8 * 60; // 8:00 am
export const STREAK_EVENING = 20 * 60; // 8:00 pm
export const COMEBACK = 19 * 60; // 7:00 pm
// Nothing done yet? The evening gets more insistent, Duolingo-style: 8 pm, 9:30 pm, 10:30 pm, 11:15 pm.
export const STREAK_LATE = 21 * 60 + 30; // 9:30 pm
export const STREAK_LAST_CALL = 22 * 60 + 30; // 10:30 pm
export const STREAK_FINAL = 23 * 60 + 15; // 11:15 pm
const WORKOUT_FOLLOW_UP = 90; // workout not done 1.5 h after its time
const WORKOUT_HEADS_UP = 30; // "in 30 min" before the workout
const CHECK_INS = [11 * 60, 16 * 60]; // friendly check-ins: 11 am, 4 pm
const DAY_DONE = 21 * 60; // 9 pm: everything done -> a proper well done
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

const timeLeft = (today) => {
  const left = 24 * 60 - today.minutes;
  return left >= 60 ? `${Math.floor(left / 60)}h ${left % 60 ? `${left % 60}m` : ""}`.trim() : `${left} min`;
};

// 2 h after the chosen workout time and still not done (only when the evening nudge isn't close).
function workoutFollowUp(p, plan, today) {
  const w = plan.workout;
  const [title, body] = pick(
    [
      [`${w} is still on`, "Even 20 minutes counts today."],
      [`Skipping ${w}?`, "Your future self says no. A short one works."],
      [`${w} is waiting`, plan.first ? `Start with ${plan.first}. The rest follows.` : "Start with one set. The rest follows."],
    ],
    `${today.date}workout2`,
  );
  return { kind: "workout_follow", title, body, url: "/workout", actions: [{ action: "open", title: "Start now" }, { action: "snooze", title: "In 1 hour" }] };
}

// 9:30 pm, nothing done yet: a little sadder.
function streakLate(p, streak, today, nothingLogged, missing) {
  const name = firstName(p);
  if (missing) {
    const [title, body] = pick(
      [
        ["Nothing logged today", `${missing}. ${timeLeft(today)} left.`],
        [name ? `${name}, today is slipping` : "Today is slipping", `${missing}. Still time.`],
      ],
      `${today.date}late`,
    );
    return { kind: "streak_late", title, body, url: "/home", actions: [{ action: "open", title: "Do it now" }, { action: "snooze", title: "In 1 hour" }] };
  }
  const variants =
    streak > 0
      ? [
          ["This is getting awkward", `Your ${streak}-day streak is still waiting on you.`],
          ["Hello? Anyone there?", `${streak} days of work. ${timeLeft(today)} left to save it.`],
          [name ? `${name}, it's getting late` : "It's getting late", "Your streak is starting to worry."],
        ]
      : [
          ["Still nothing today", nothingLogged ? "Not one meal, not one set. Let's fix that." : "Finish today and day 1 is yours."],
          ["Your plan feels ignored", "One workout or tonight's dinner. It still counts."],
          [name ? `${name}, it's getting late` : "It's getting late", "Today can still be day 1."],
        ];
  const [title, body] = pick(variants, `${today.date}late`);
  return { kind: "streak_late", title, body, url: "/home", actions: [{ action: "open", title: "Do it now" }, { action: "snooze", title: "In 1 hour" }] };
}

// 11:15 pm, streak about to go: the crying one.
function streakFinal(p, streak, freezes, today) {
  const time = timeLeft(today);
  const variants =
    freezes > 0
      ? [
          ["Your freeze is nervous", `${time} left. Save it for a real emergency.`],
          ["We're not crying. You are.", `${time} left on your ${streak}-day streak.`],
        ]
      : [
          ["We're not crying. You are.", `${time} left on your ${streak}-day streak.`],
          ["This is it", `${time}. Then ${streak} days become 0.`],
          ["Please don't go", `Your ${streak}-day streak has ${time} left.`],
        ];
  const [title, body] = pick(variants, `${today.date}final`);
  return { kind: "streak_final", title, body, url: "/home", requireInteraction: true, actions: [{ action: "open", title: "Save it" }] };
}

function streakLastCall(p, streak, freezes, today) {
  const time = timeLeft(today);
  if (streak === 0) {
    const [title, body] = pick(
      [
        ["Day 1 is slipping away", `${time} left to make today count.`],
        [`${time} left today`, "Log dinner or a quick workout. Streak starts."],
      ],
      `${today.date}last`,
    );
    return { kind: "streak_last", title, body, url: "/home", requireInteraction: true, actions: [{ action: "open", title: "Start it" }] };
  }
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

// A clock time in the plan wins; then the usual time for breakfast/lunch/snack/dinner; only meals
// with no usual time ("Pre-workout shake") follow the workout time.
export function mealTime(slot, workoutAt = null) {
  const clock = parseTime(slot.time);
  if (clock != null) return clock;
  const usual = SLOT_TIME[String(slot.slot).toLowerCase()];
  if (usual != null) return usual;
  const t = `${slot.time ?? ""} ${slot.slot ?? ""}`.toLowerCase();
  if (workoutAt != null && /post[- ]?workout|after (the )?workout/.test(t)) return workoutAt + 60;
  if (workoutAt != null && /pre[- ]?workout|before (the )?workout/.test(t)) return Math.max(0, workoutAt - 60);
  return null;
}

// Every line names today's actual dish (the plan's, or the one they swapped to).
const MEAL_COPY = {
  breakfast: (d, n) => [
    ["Breakfast?", `Today's breakfast is ${d}. Eat up, then log it.`],
    ["Breakfast?", `${d} is waiting. Log it in one tap.`],
    [`${d}, anyone?`, `Today's breakfast. Best way to start day ${n}.`],
  ],
  lunch: (d, n) => [
    ["Lunch o'clock", `Today's lunch is ${d}. Eat, then log it.`],
    ["What's for lunch?", `We know. It's ${d}. Tap to log.`],
    [`${d} called`, "It's your lunch today. Log it, your streak agrees."],
  ],
  snack: (d) => [
    ["Snack time", `Today's snack is ${d}. Grab it, log it.`],
    ["Evening hunger is real", `${d} fixes that. Tap to log.`],
  ],
  dinner: (d, n) => [
    ["Dinner time", `Tonight it's ${d}. Eat, log, lock in day ${n}.`],
    [`${d} > midnight cravings`, "Tonight's dinner. Tap to log it."],
    ["Last meal of the day", `${d}, then you're done for today.`],
  ],
};

function mealReminder(p, slot, streak, today) {
  const key = String(slot.slot).toLowerCase();
  // Swapped today? Name the meal they actually chose.
  const swapped = p.today_log?.day === today.date ? p.today_log.swaps?.[slot.slot] : null;
  const dish = swapped || slot.name || "Your meal";
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

function streakStart(p, today) {
  const name = firstName(p);
  const plan = p.plan_week?.[today.weekday];
  const what = plan?.workout ?? "today's meals";
  const [title, body] = pick(
    [
      ["Day 1 starts tonight", `Follow ${what} and you're on a streak.`],
      [name ? `Still time, ${name}` : "Still time today", `${what.charAt(0).toUpperCase() + what.slice(1)} gets your streak going.`],
      ["Start your streak today", "One day of following the plan. That's all it takes."],
    ],
    `${today.date}start`,
  );
  return { kind: "streak_start", title, body, url: "/home", actions: [{ action: "open", title: "Let's go" }, { action: "snooze", title: "In 1 hour" }] };
}

function comeBack(p, today, away) {
  const name = firstName(p);
  const plan = p.plan_week?.[today.weekday];
  const [title, body] = pick(
    [
      [name ? `We miss you, ${name}` : "We miss you", plan?.workout ? `Today's ${plan.workout} is ready. Pick up where you left off.` : "Your plan is right where you left it."],
      [`${away} days off. That's okay.`, "Today is a good day to start again."],
      ["Your plan is waiting", plan?.workout ? `${plan.workout} today. Even half of it counts.` : "Log today's meals and you're back on track."],
    ],
    `${today.date}comeback`,
  );
  return { kind: "comeback", title, body, url: "/home", actions: [{ action: "open", title: "Open plan" }] };
}

// At the meal's time: what to eat now.
const MEAL_NOW = {
  breakfast: (d, n) => [
    ["Breakfast time", `${d}. Start the day right.`],
    [n ? `Morning, ${n}` : "Morning", `Breakfast is ${d}. Eat, then tap to log.`],
  ],
  lunch: (d) => [
    ["Lunch time", `${d} is on the menu.`],
    ["Time to refuel", `Lunch: ${d}. Log it when you're done.`],
  ],
  snack: (d) => [["Snack time", `${d}. Small bite, big help.`]],
  dinner: (d) => [
    ["Dinner time", `Tonight: ${d}.`],
    ["What's for dinner?", `${d}. Eat, log, done.`],
  ],
};
function mealNow(p, slot, today) {
  const key = String(slot.slot).toLowerCase();
  const swapped = p.today_log?.day === today.date ? p.today_log.swaps?.[slot.slot] : null;
  const dish = swapped || slot.name || "Your meal";
  const pool = (MEAL_NOW[key] ?? ((d) => [[`${slot.slot} time`, `${d}. Tap to log it.`]]))(dish, firstName(p));
  const [title, body] = pick(pool, `${today.date}${key}now`);
  return { kind: `meal_${key.replace(/[^a-z]/g, "") || "meal"}_now`, title, body, url: "/diet", actions: [{ action: "open", title: "Log it" }, { action: "snooze", title: "In 1 hour" }] };
}

// 30 min before the workout.
function workoutSoon(p, plan, today) {
  const [title, body] = pick(
    [
      [`In 30 min: ${plan.workout}`, "Fill your bottle. Warm-up first."],
      [`${plan.workout} in 30`, plan.first ? `First up: ${plan.first}. Get ready.` : "Get your kit ready."],
    ],
    `${today.date}soon`,
  );
  return { kind: "workout_soon", title, body, url: "/workout", actions: [{ action: "open", title: "See workout" }] };
}

// Friendly check-ins through the day, about what's left.
function checkIn(p, today, slot, left) {
  const name = firstName(p);
  const pool =
    slot === 0
      ? [
          [name ? `How's it going, ${name}?` : "How's it going?", left ? `${left} left today. Water break?` : "Water break? Two glasses now."],
          ["Quick check-in", left ? `Still on: ${left}.` : "Stay hydrated. You're on track."],
        ]
      : [
          [name ? `Afternoon, ${name}` : "Afternoon check-in", left ? `Still to do: ${left}.` : "Good going. Keep it up."],
          ["Halfway there", left ? `${left} to go. You've got this.` : "Drink some water. Evening is coming."],
        ];
  const [title, body] = pick(pool, `${today.date}check${slot}`);
  return { kind: `checkin_${slot}`, title, body, url: "/home", actions: [{ action: "open", title: "Open plan" }] };
}

// 9 pm, everything done.
function dayDone(p, streak, today) {
  const name = firstName(p);
  const [title, body] = pick(
    [
      [streak > 0 ? `Day ${streak} done` : "Day done", "Everything ticked. See you tomorrow."],
      [name ? `Proud of you, ${name}` : "Proud of you", streak > 1 ? `${streak} days in a row. Rest well.` : "Today counted. Rest well."],
    ],
    `${today.date}done`,
  );
  return { kind: "day_done", title, body, url: "/home" };
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
  // Evening, nothing done yet: it escalates. Streak or not, the day can still count.
  const loggedSlots = p.today_log?.day === today.date ? p.today_log.slots ?? [] : [];
  if (p.notify_streak && planned && !doneToday) {
    if (streak > 0 && today.minutes >= STREAK_FINAL) out.push(streakFinal(p, streak, freezes, today));
    else if (due(STREAK_EVENING)) out.push(streak > 0 ? streakEvening(p, streak, freezes, today) : streakStart(p, today));
    else if (due(STREAK_LATE)) {
      // Name what is still open: "Breakfast, lunch, dinner and Legs not done".
      const done = new Set(loggedSlots.map((x) => String(x).toLowerCase()));
      const open = (plan?.slots ?? []).filter((x) => !done.has(String(x.slot).toLowerCase())).map((x) => String(x.slot).toLowerCase());
      const parts = [...open, ...(plan?.workout ? ["your workout"] : [])];
      const missing = parts.length ? `${parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts.at(-1) : parts[0]} not done`.replace(/^./, (c) => c.toUpperCase()) : null;
      out.push(streakLate(p, streak, today, loggedSlots.length === 0, missing));
    }
    else if (due(STREAK_LAST_CALL)) out.push(streakLastCall(p, streak, freezes, today));
  }
  // Workout: heads-up 30 min before, and a follow-up 1.5 h after if it isn't done.
  const workoutDone = p.today_log?.day === today.date && p.today_log.workout === true;
  if (workoutOn && !doneToday && !workoutDone && workoutAt - WORKOUT_HEADS_UP >= 6 * 60 && due(workoutAt - WORKOUT_HEADS_UP)) out.push(workoutSoon(p, plan, today));
  if (workoutOn && !doneToday && !workoutDone && due(workoutAt + WORKOUT_FOLLOW_UP)) out.push(workoutFollowUp(p, plan, today));

  // Friendly check-ins (11 am, 4 pm) naming what's still left.
  if (p.notify_morning !== false && planned && !doneToday) {
    const doneSlots = new Set(loggedSlots.map((x) => String(x).toLowerCase()));
    const leftParts = [...(plan?.slots ?? []).filter((x) => !doneSlots.has(String(x.slot).toLowerCase())).map((x) => String(x.slot).toLowerCase()), ...(plan?.workout && !workoutDone ? ["workout"] : [])];
    const left = leftParts.length ? (leftParts.length > 1 ? leftParts.slice(0, -1).join(", ") + " and " + leftParts.at(-1) : leftParts[0]) : "";
    CHECK_INS.forEach((t, i) => {
      if (due(t)) out.push(checkIn(p, today, i, left.replace(/^./, (c) => c.toUpperCase())));
    });
  }
  // 9 pm and everything is done: say so.
  if (doneToday && p.notify_streak && due(DAY_DONE)) out.push(dayDone(p, streak, today));

  // Haven't opened FitMate for 2+ days: a gentle "come back" at 7 pm, on day 2, 5, 8, … only.
  const away = p.streak_day ? Math.round((new Date(`${today.date}T12:00:00Z`) - new Date(`${p.streak_day}T12:00:00Z`)) / 86400000) : 0;
  if (away >= 2 && (away - 2) % 3 === 0 && planned && due(COMEBACK)) out.push(comeBack(p, today, away));

  // Meals: one at the meal's time, and a follow-up ~45 min later if it isn't logged.
  if (p.notify_meals !== false && !doneToday) {
    const logged = new Set(p.today_log?.day === today.date ? (p.today_log.slots ?? []).map((x) => String(x).toLowerCase()) : []);
    for (const slot of plan?.slots ?? []) {
      const at = mealTime(slot, plan?.workout ? workoutAt : null);
      if (at == null || logged.has(String(slot.slot).toLowerCase())) continue;
      if (due(at)) out.push(mealNow(p, slot, today)); // at the meal's time
      if (due(at + MEAL_DELAY)) out.push(mealReminder(p, slot, streak, today)); // not logged 45 min later
    }
  }
  // No spacing or daily limits: everything due goes out (each kind at most once a day).
  return out.map((r) => ({ ...r, day: today.date }));
}
