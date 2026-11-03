import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { tidyExerciseName } from "@/lib/data/tidyName";

// Adds exercise names from a saved plan to the shared catalog. The caller must be signed in
// (their access token is verified here); writes use the server-only secret key.
const MAX_PER_REQUEST = 60;
const VALID = /^[\p{L}\p{N}][\p{L}\p{N} .,'()/+&%-]*$/u;

export async function POST(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: "Not configured." }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth?.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Clean, validate and de-duplicate.
  const byKey = new Map();
  for (const item of Array.isArray(body?.exercises) ? body.exercises.slice(0, MAX_PER_REQUEST) : []) {
    const name = tidyExerciseName(String(item?.name ?? ""));
    if (name.length < 2 || name.length > 80 || !VALID.test(name)) continue;
    byKey.set(name.toLowerCase(), { name_key: name.toLowerCase(), name, type: item?.type === "hold" ? "hold" : "reps" });
  }
  const rows = [...byKey.values()];
  if (!rows.length) return Response.json({ added: 0, updated: 0 });

  const { data: existing, error: readError } = await admin.from("exercise_catalog").select("name_key, uses").in("name_key", rows.map((r) => r.name_key));
  if (readError) return Response.json({ error: readError.message }, { status: 500 });
  const known = new Map(existing.map((r) => [r.name_key, r.uses]));

  const fresh = rows.filter((r) => !known.has(r.name_key));
  if (fresh.length) {
    const { error } = await admin.from("exercise_catalog").upsert(fresh, { onConflict: "name_key", ignoreDuplicates: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  // Popularity: bump the count of names that were already there.
  for (const r of rows.filter((r) => known.has(r.name_key))) {
    await admin.from("exercise_catalog").update({ uses: known.get(r.name_key) + 1, updated_at: new Date().toISOString() }).eq("name_key", r.name_key);
  }
  return Response.json({ added: fresh.length, updated: rows.length - fresh.length });
}
