// "  freestanding   HANDSTAND practice " -> "Freestanding Handstand Practice".
// Each word starts with a capital; hyphenated parts after the first stay lower case ("Push-up").
// Short all-caps tokens (HSPU, RDL, L-sit's "L") are kept as written.
export function tidyExerciseName(text) {
  return String(text)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (/^[A-Z0-9]{2,5}$/.test(word)) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
