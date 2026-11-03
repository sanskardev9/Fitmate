import Dexie from "dexie";
import { DB_NAME, SCHEMA_V1, SCHEMA_V2 } from "./schema";

// IndexedDB only exists in the browser; import this from client components only.
export const db = new Dexie(DB_NAME);

db.version(1).stores(SCHEMA_V1);
db.version(2).stores(SCHEMA_V2);

export const TABLES = Object.keys(SCHEMA_V2);

// ---- change tracking for cloud sync -------------------------------------------------
// Every local write stamps `_ts`; deletes leave a tombstone. Writes applied *from* the cloud
// run inside `applyRemote`, which skips both so they aren't echoed back.

let remoteDepth = 0;
const changeListeners = new Set();
const TOMBSTONES = "fitmate:tombstones";

export async function applyRemote(fn) {
  remoteDepth++;
  try {
    return await fn();
  } finally {
    remoteDepth--;
  }
}

export function onLocalChange(fn) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

const notify = () => changeListeners.forEach((fn) => fn());

export function readTombstones() {
  try {
    return JSON.parse(localStorage.getItem(TOMBSTONES) ?? "[]");
  } catch {
    return [];
  }
}

export function writeTombstones(list) {
  try {
    localStorage.setItem(TOMBSTONES, JSON.stringify(list));
  } catch {}
}

for (const name of TABLES) {
  const table = db.table(name);
  table.hook("creating", (_pk, obj) => {
    if (remoteDepth) return;
    obj._ts = Date.now();
    queueMicrotask(notify);
  });
  table.hook("updating", () => {
    if (remoteDepth) return undefined;
    queueMicrotask(notify);
    return { _ts: Date.now() };
  });
  table.hook("deleting", (pk) => {
    if (remoteDepth) return;
    writeTombstones([...readTombstones().filter((t) => !(t.c === name && t.id === String(pk))), { c: name, id: String(pk) }]);
    queueMicrotask(notify);
  });
}
