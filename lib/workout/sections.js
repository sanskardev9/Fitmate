// Workout sections: warm-up and cool-down are kept apart from the main work. They show in their
// own blocks and don't count toward planned/done sets or the streak.
export const SECTIONS = [
  ["warmup", "Warm-up"],
  ["main", "Main"],
  ["cooldown", "Cool-down"],
];
export const SECTION_LABEL = Object.fromEntries(SECTIONS);

const WARMUP_WORDS = /\b(warm[- ]?up|mobility|preparation|prep|activation|activate|circles?|dead hang|scapular (push|pull)|wall slides?|band pull[- ]?aparts?|jumping jacks|light jog)\b/i;
const COOLDOWN_WORDS = /\b(cool[- ]?down|stretch(es|ing)?|foam roll(ing)?|breathing|full body mobility)\b/i;

export const normalizeSection = (v) => {
  const s = String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (s.startsWith("warm") || s === "prep") return "warmup";
  if (s.startsWith("cool") || s === "stretch") return "cooldown";
  return s === "main" ? "main" : null;
};

// For plans without sections: leading prep-style items are warm-up, trailing stretches are cool-down.
export function inferSections(exercises) {
  const text = (e) => `${e.name} ${e.notes ?? ""}`;
  const out = exercises.map((e) => ({ ...e, section: normalizeSection(e.section) }));
  if (out.some((e) => e.section)) return out.map((e) => ({ ...e, section: e.section ?? "main" }));
  let i = 0;
  while (i < out.length - 1 && WARMUP_WORDS.test(text(out[i])) && !COOLDOWN_WORDS.test(out[i].name)) out[i++].section = "warmup";
  let j = out.length - 1;
  while (j > i && COOLDOWN_WORDS.test(text(out[j]))) out[j--].section = "cooldown";
  return out.map((e) => ({ ...e, section: e.section ?? "main" }));
}

export const isMain = (e) => (e?.section ?? "main") === "main";
