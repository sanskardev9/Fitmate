import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Creates an already-confirmed account so new users can sign in immediately, without an
// email verification step. The browser then signs in with the same email and password.
export async function POST(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: "Accounts aren't configured on the server." }, { status: 503 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const fullName = String(body?.fullName ?? "").trim().slice(0, 80);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: "Please enter a valid email address.", code: "validation_failed" }, { status: 400 });
  }
  if (password.length < 6 || password.length > 72) {
    return Response.json({ error: "Password must be 6 to 72 characters.", code: "weak_password" }, { status: 400 });
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    const exists = error.code === "email_exists" || /already (been )?registered/i.test(error.message);
    return Response.json(
      { error: exists ? "An account with this email already exists. Sign in instead." : error.message, code: exists ? "user_already_exists" : error.code },
      { status: exists ? 409 : 400 },
    );
  }
  return Response.json({ ok: true }, { status: 201 });
}
