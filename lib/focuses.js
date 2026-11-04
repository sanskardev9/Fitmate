// Extra training focuses ("Also want to…"). The main goal sets calories and protein; these only
// shape the training plan, so any number can be picked.
export const FOCUSES = [
  { id: "skills", label: "Calisthenics skills", sub: "Handstand, muscle-up, front lever, planche", ai: "learn calisthenics skills (add skill progressions such as handstand, muscle-up, front lever or planche at my level)" },
  { id: "strength", label: "Get stronger", sub: "Heavier lifts, harder variations", ai: "get stronger (low-rep strength work on the main lifts or hardest variations)" },
  { id: "mobility", label: "Mobility & flexibility", sub: "Move better, fewer aches", ai: "improve mobility and flexibility (short mobility blocks in warm-ups and cool-downs)" },
  { id: "endurance", label: "Endurance & running", sub: "Stamina and cardio", ai: "build endurance (add conditioning or running work)" },
  { id: "core", label: "Core & abs", sub: "Strong, stable midsection", ai: "a stronger core (core work on most training days)" },
  { id: "posture", label: "Better posture", sub: "Upper back and shoulders", ai: "better posture (upper-back, rear-delt and scapular work)" },
];
export const focusLabel = (id) => FOCUSES.find((f) => f.id === id)?.label ?? id;
// The main goal already covers it (e.g. main goal "Calisthenics skills" -> no "skills" extra).
export const COVERED_BY_GOAL = { calisthenics_skills: "skills", gain_strength: "strength" };
