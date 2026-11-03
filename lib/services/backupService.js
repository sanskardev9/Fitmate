import { db, TABLES } from "@/lib/db/dexie";

const FORMAT = "fitmate-backup";
const FORMAT_VERSION = 1;

export async function exportData() {
  const data = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  return { format: FORMAT, version: FORMAT_VERSION, exportedAt: new Date().toISOString(), data };
}

export function downloadBackup(backup) {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fitmate-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Replaces all local data with the backup contents.
export async function importData(backup) {
  if (backup?.format !== FORMAT || typeof backup.data !== "object") {
    throw new Error("Not a FitMate backup file.");
  }
  if (backup.version > FORMAT_VERSION) {
    throw new Error("This backup was made by a newer version of FitMate.");
  }
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = backup.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}
