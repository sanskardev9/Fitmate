import { db } from "@/lib/db/dexie";
import { DEFAULT_PREFERENCES } from "@/lib/db/schema";

export async function getPreferences() {
  const rows = await db.preferences.toArray();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export function setPreference(key, value) {
  return db.preferences.put({ key, value });
}
