import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendMail, resetCodeEmail } from "@/lib/server/mail";
import { normalizeEmail, validEmail, newCode, hashCode, findUserId, CODE_TTL_MIN, MIN_RESEND_SEC, MAX_SENDS_PER_HOUR } from "@/lib/server/resetCodes";

// Step 1: email a 6-digit code. Always answers the same way, so it never reveals whether
// an account exists. Rate-limited per email: 1 per minute, 5 per hour.
const OK = { ok: true, message: "If an account exists for this email, we've sent a 6-digit code." };

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
  if (!validEmail(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  const now = Date.now();
  const { data: existing } = await admin.from("password_reset_codes").select("*").eq("email", email).maybeSingle();
  if (existing) {
    const since = (now - new Date(existing.last_sent_at).getTime()) / 1000;
    if (since < MIN_RESEND_SEC) return Response.json({ error: `Please wait ${Math.ceil(MIN_RESEND_SEC - since)}s before asking for another code.` }, { status: 429 });
    const inWindow = now - new Date(existing.window_start).getTime() < 3600_000;
    if (inWindow && existing.sends_in_window >= MAX_SENDS_PER_HOUR) return Response.json({ error: "Too many codes requested. Try again in an hour." }, { status: 429 });
  }

  const userId = await findUserId(admin, email).catch(() => null);
  if (!userId) return Response.json(OK); // same answer as success

  const code = newCode();
  const inWindow = existing && now - new Date(existing.window_start).getTime() < 3600_000;
  const { error } = await admin.from("password_reset_codes").upsert(
    {
      email,
      user_id: userId,
      code_hash: hashCode(email, code),
      expires_at: new Date(now + CODE_TTL_MIN * 60_000).toISOString(),
      attempts: 0,
      last_sent_at: new Date(now).toISOString(),
      window_start: inWindow ? existing.window_start : new Date(now).toISOString(),
      sends_in_window: inWindow ? existing.sends_in_window + 1 : 1,
    },
    { onConflict: "email" },
  );
  if (error) return Response.json({ error: "Couldn't create a code. Try again." }, { status: 500 });

  try {
    await sendMail({ to: email, ...resetCodeEmail(code) });
  } catch (err) {
    return Response.json({ error: err.message || "Couldn't send the email. Try again." }, { status: 502 });
  }
  return Response.json(OK);
}
