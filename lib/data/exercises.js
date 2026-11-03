// Built-in exercise library. `type` decides whether targets are reps or a hold (seconds).
// Rest defaults follow the PRD table and can be overridden per exercise.
export const EXERCISE_CATEGORIES = {
  skill: { label: "Skill / Statics", restSec: 150 },
  pull: { label: "Pull", restSec: 105 },
  push: { label: "Push", restSec: 105 },
  handstand: { label: "Handstand", restSec: 75 },
  legs: { label: "Legs", restSec: 120 },
  strength: { label: "Strength (weights)", restSec: 120 },
  core: { label: "Core / Accessories", restSec: 50 },
  mobility: { label: "Mobility", restSec: 30 },
};

const e = (name, category, type = "reps") => ({ name, category, type });

export const EXERCISES = [
  e("Tuck Planche", "skill", "hold"),
  e("Advanced Tuck Planche", "skill", "hold"),
  e("Straddle Planche", "skill", "hold"),
  e("Planche Lean", "skill", "hold"),
  e("Pseudo Planche Push-up", "skill"),
  e("Tuck Planche Push-up", "skill"),
  e("Straddle Planche Push-up", "skill"),
  e("Planche Lean Push-up", "skill"),
  e("Tuck Front Lever Row", "skill"),
  e("Front Lever Pull-up", "skill"),
  e("Tuck Planche Press", "skill"),
  e("Tuck Front Lever", "skill", "hold"),
  e("Advanced Tuck Front Lever", "skill", "hold"),
  e("Straddle Front Lever", "skill", "hold"),
  e("Front Lever Raise", "skill"),
  e("Back Lever", "skill", "hold"),
  e("L-sit", "skill", "hold"),
  e("V-sit", "skill", "hold"),
  e("Muscle-up", "skill"),

  e("Pull-up", "pull"),
  e("Chin-up", "pull"),
  e("Weighted Pull-up", "pull"),
  e("Archer Pull-up", "pull"),
  e("Australian Row", "pull"),
  e("Scapula Pull-up", "pull"),
  e("Dead Hang", "pull", "hold"),
  e("Barbell Row", "pull"),
  e("Lat Pulldown", "pull"),
  e("Seated Cable Row", "pull"),
  e("Face Pull", "pull"),
  e("Bicep Curl", "pull"),

  e("Push-up", "push"),
  e("Diamond Push-up", "push"),
  e("Archer Push-up", "push"),
  e("Pike Push-up", "push"),
  e("Dip", "push"),
  e("Weighted Dip", "push"),
  e("Bench Press", "push"),
  e("Incline Dumbbell Press", "push"),
  e("Overhead Press", "push"),
  e("Lateral Raise", "push"),
  e("Tricep Pushdown", "push"),

  e("Wall Handstand", "handstand", "hold"),
  e("Freestanding Handstand", "handstand", "hold"),
  e("Handstand Push-up", "handstand"),
  e("Wall Walk", "handstand"),
  e("Crow Pose", "handstand", "hold"),

  e("Squat", "legs"),
  e("Back Squat", "legs"),
  e("Front Squat", "legs"),
  e("Bulgarian Split Squat", "legs"),
  e("Pistol Squat", "legs"),
  e("Lunge", "legs"),
  e("Romanian Deadlift", "legs"),
  e("Leg Press", "legs"),
  e("Calf Raise", "legs"),
  e("Nordic Curl", "legs"),

  e("Deadlift", "strength"),
  e("Hip Thrust", "strength"),
  e("Farmer's Carry", "strength"),

  e("Plank", "core", "hold"),
  e("Hollow Body Hold", "core", "hold"),
  e("Hanging Leg Raise", "core"),
  e("Toes to Bar", "core"),
  e("Dragon Flag", "core"),
  e("Ab Wheel Rollout", "core"),
  e("Russian Twist", "core"),
  e("Side Plank", "core", "hold"),

  e("Wrist Warm-up", "mobility"),
  e("Shoulder Dislocates", "mobility"),
  e("Pancake Stretch", "mobility", "hold"),
  e("Pike Stretch", "mobility", "hold"),
];

export const exerciseDefaults = (ex) => ({
  type: ex?.type ?? "reps",
  restSec: EXERCISE_CATEGORIES[ex?.category]?.restSec ?? 90,
});

// Best guess for a custom exercise name: movement words mean reps, static words mean a hold.
// Movement wins, so "Tuck Planche Push-up" is reps even though "planche" alone is a hold.
const REPS_WORDS = /push[\s-]?ups?|pull[\s-]?ups?|chin[\s-]?ups?|dips?|rows?|press|raises?|curls?|squats?|lunges?|deadlifts?|thrusts?|extensions?|flyes?|flys?|presses|muscle[\s-]?ups?|reps?/i;
const HOLD_WORDS = /\bhold\b|holds|plank|hang|l[\s-]?sit|v[\s-]?sit|lever|planche|handstand|wall sit|stretch|isometric|static/i;

export function inferType(name) {
  if (REPS_WORDS.test(name)) return "reps";
  if (HOLD_WORDS.test(name)) return "hold";
  return null;
}
