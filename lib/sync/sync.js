import { db, TABLES, applyRemote, readTombstones, writeTombstones } from "@/lib/db/dexie";
import { supabase } from "@/lib/supabase/client";

// Two-way sync between local IndexedDB and public.user_records (one row per local record).
// Push: rows whose `_ts` is newer than the last push, plus tombstones. Pull: rows whose server
// `updated_at` is newer than the last pull. Last write wins.

const CHUNK = 300;
const OVERLAP_MS = 5000; // re-read a few seconds back so concurrent commits are never skipped
const key = (userId, k) => `fitmate:sync:${userId}:${k}`;
const pkOf = (table) => db.table(table).schema.primKey.keyPath;

let running = null;
let state = { status: "idle", lastSyncedAt: null, error: null };
const listeners = new Set();

export const getSyncState = () => state;
export function subscribeSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

const get = (userId, k) => localStorage.getItem(key(userId, k));
const set = (userId, k, v) => localStorage.setItem(key(userId, k), v);

// Local data belongs to whoever last synced on this device. A different account starts clean.
async function claimDevice(userId) {
  const owner = localStorage.getItem("fitmate:owner");
  if (owner && owner !== userId) {
    await applyRemote(() => db.transaction("rw", TABLES.map((t) => db.table(t)), () => Promise.all(TABLES.map((t) => db.table(t).clear()))));
    writeTombstones([]);
  }
  localStorage.setItem("fitmate:owner", userId);
}

async function push(userId) {
  const since = Number(get(userId, "pushed") ?? 0);
  const startedAt = Date.now();
  const rows = [];
  for (const table of TABLES) {
    const pk = pkOf(table);
    const changed = await db.table(table).filter((r) => (r._ts ?? 1) > since).toArray();
    for (const r of changed) rows.push({ user_id: userId, collection: table, id: String(r[pk]), data: r, deleted: false });
  }
  const tombstones = readTombstones();
  for (const t of tombstones) rows.push({ user_id: userId, collection: t.c, id: t.id, data: null, deleted: true });

  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from("user_records").upsert(rows.slice(i, i + CHUNK), { onConflict: "user_id,collection,id" });
    if (error) throw error;
  }
  // Keep tombstones added while we were pushing.
  const sent = new Set(tombstones.map((t) => `${t.c}:${t.id}`));
  writeTombstones(readTombstones().filter((t) => !sent.has(`${t.c}:${t.id}`)));
  set(userId, "pushed", String(startedAt));
  return rows.length;
}

async function pull(userId) {
  let cursor = get(userId, "pulled") ?? "1970-01-01T00:00:00.000Z";
  let applied = 0;
  for (;;) {
    const from = new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString();
    const { data, error } = await supabase
      .from("user_records")
      .select("collection,id,data,deleted,updated_at")
      .gt("updated_at", from)
      .order("updated_at", { ascending: true })
      .limit(1000);
    if (error) throw error;
    const fresh = data.filter((r) => TABLES.includes(r.collection));
    if (fresh.length) {
      await applyRemote(() =>
        db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
          for (const r of fresh) {
            const table = db.table(r.collection);
            if (r.deleted) await table.delete(r.id);
            else if (r.data) await table.put(r.data);
          }
        }),
      );
      applied += fresh.length;
    }
    if (!data.length) break;
    const last = data[data.length - 1].updated_at;
    if (last === cursor || data.length < 1000) {
      cursor = last;
      break;
    }
    cursor = last;
  }
  set(userId, "pulled", cursor);
  return applied;
}

// The server is the source of truth for anything already pushed. Rows removed on the server without a
// tombstone (deleted in the dashboard, account reset) are removed here too. Runs right after push, so
// every local change older than the push cursor is already on the server; newer local edits are kept.
const RECONCILE_EVERY_MS = 60 * 1000;
let lastReconcile = 0;

async function reconcile(userId) {
  const pushedAt = Number(get(userId, "pushed") ?? 0);
  const onServer = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("user_records").select("collection,id").eq("deleted", false).order("id").range(from, from + 999);
    if (error) throw error;
    for (const r of data) onServer.add(`${r.collection}:${r.id}`);
    if (data.length < 1000) break;
  }
  let removed = 0;
  await applyRemote(() =>
    db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
      for (const table of TABLES) {
        const pk = pkOf(table);
        const gone = await db.table(table).filter((r) => (r._ts ?? 1) <= pushedAt && !onServer.has(`${table}:${String(r[pk])}`)).primaryKeys();
        if (gone.length) await db.table(table).bulkDelete(gone);
        removed += gone.length;
      }
    }),
  );
  lastReconcile = Date.now();
  return removed;
}

export function syncNow(userId) {
  if (!supabase || !userId) return Promise.resolve();
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setState({ status: "offline" });
    return Promise.resolve();
  }
  if (running) return running;
  running = (async () => {
    setState({ status: "syncing", error: null });
    try {
      await claimDevice(userId);
      await push(userId);
      await pull(userId);
      if (Date.now() - lastReconcile > RECONCILE_EVERY_MS) await reconcile(userId);
      setState({ status: "idle", lastSyncedAt: Date.now() });
    } catch (err) {
      console.error("FitMate sync failed", err);
      setState({ status: "error", error: err.message ?? String(err) });
    } finally {
      running = null;
    }
  })();
  return running;
}
