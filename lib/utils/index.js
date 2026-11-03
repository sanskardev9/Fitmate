// crypto.randomUUID only exists in secure contexts (HTTPS/localhost), so phones testing over
// http://<LAN-IP> need the getRandomValues fallback, which builds the same RFC 4122 v4 format.
export function uid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const now = () => Date.now();

// Local calendar date as YYYY-MM-DD (not UTC), used as the key for daily logs.
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "3 × 8", "3 × 30s", "3 × 2 min", plus " @ 20 kg" when weighted.
export function formatTarget(ex) {
  let target;
  if (ex.type !== "hold") target = ex.reps ?? "–";
  else if (ex.targetUnit === "min") target = `${Math.round((ex.holdSec / 60) * 100) / 100} min`;
  else target = `${ex.holdSec ?? "–"}s`;
  const weight = ex.weight ?? ex.weightKg;
  return `${ex.sets} × ${target}${weight ? ` @ ${weight} ${ex.weightUnit ?? "kg"}` : ""}`;
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
