// Dexie store definitions. Only indexed fields are listed; records may hold more.
// Plans (workoutPlans/trainingDays/exercises, dietPlans/dietDays/meals) are editable.
// Logs (workoutSessions/sessionSets, mealLogs, bodyMetrics) are immutable history and
// store snapshots of the planned values, so editing a plan never rewrites the past.
export const DB_NAME = "fitmate";

export const SCHEMA_V1 = {
  preferences: "key",

  workoutPlans: "id, archived, updatedAt",
  trainingDays: "id, planId, [planId+order], *weekdays",
  exercises: "id, dayId, planId, [dayId+order]",

  workoutSessions: "id, planId, dayId, startedAt, finishedAt",
  sessionSets: "id, sessionId, exerciseId, [sessionId+order], completedAt",

  dietPlans: "id, archived, updatedAt",
  dietDays: "id, planId, [planId+order], *weekdays",
  meals: "id, dayId, planId, [dayId+order]",

  mealLogs: "id, date, mealId, [date+mealId]",
  bodyMetrics: "id, date",
};

// v2: index set logs by exercise name, for "last time" lookups during a workout.
export const SCHEMA_V2 = {
  ...SCHEMA_V1,
  sessionSets: "id, sessionId, exerciseId, exerciseName, [sessionId+order], completedAt",
};

export const DEFAULT_PREFERENCES = {
  activeWorkoutPlanId: null,
  activeDietPlanId: null,
  // null means "use the total of today's planned meals".
  proteinTargetG: null,
  caloriesTarget: null,
  carbsTargetG: null,
  fatTargetG: null,
  defaultRestSec: 90,
  timerSound: true,
  timerVibrate: true,
};
