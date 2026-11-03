import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail, validEmail, hashCode, sameHash, MAX_ATTEMPTS } from "@/lib/server/resetCodes";

// Step 2: check the code and set the new password. 5 wrong tries or 10 minutes and the code is gone.
export async function POST(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: "Not configured." }, { status: 503 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = normalizeEmail(body?.email);
  const code = String(body?.code ?? "").replace(/\D/g, "");
  const password = String(body?.password ?? "");
  if (!validEmail(email) || code.length !== 6) return Response.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  if (password.length < 6 || password.length > 72) return Response.json({ error: "Password must be 6 to 72 characters." }, { status: 400 });

  const wrong = { error: "That code is wrong or has expired. Request a new one." };
  const { data: row } = await admin.from("password_reset_codes").select("*").eq("email", email).maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= MAX_ATTEMPTS) {
    if (row) await admin.from("password_reset_codes").delete().eq("email", email);
    return Response.json(wrong, { status: 400 });
  }

  if (!sameHash(row.code_hash, hashCode(email, code))) {
    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) await admin.from("password_reset_codes").delete().eq("email", email);
    else await admin.from("password_reset_codes").update({ attempts }).eq("email", email);
    const left = MAX_ATTEMPTS - attempts;
    return Response.json({ error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : wrong.error }, { status: 400 });
  }

  // One-time: remove the code first, then change the password.
  await admin.from("password_reset_codes").delete().eq("email", email);
  const { error } = await admin.auth.admin.updateUserById(row.user_id, { password });
  if (error) return Response.json({ error: error.message || "Couldn't update the password." }, { status: 400 });
  return Response.json({ ok: true });
}
