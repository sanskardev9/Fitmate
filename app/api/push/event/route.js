import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deviceLabel, logPushEvents } from "@/lib/server/push";

const DEVICE_STAGES = new Set(["received", "shown", "show_failed", "clicked"]);
const SETUP_STAGES = new Set(["subscribed", "subscribe_failed", "permission_denied", "unsupported"]);
const UUID = /^[0-9a-f-]{36}$/i;

// Delivery steps reported by a device. The service worker has no sign-in, so it proves who it is
// with its push endpoint (only the server and that browser know it). Setup steps from the page
// use the normal sign-in token.
export async function POST(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: "Not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const stage = String(body.stage ?? "");
  const pid = UUID.test(body.pid ?? "") ? body.pid : null;
  const ua = request.headers.get("user-agent") ?? "";

  let userId = null;
  let device = null;
  if (typeof body.endpoint === "string" && body.endpoint.startsWith("https://")) {
    const { data } = await admin.from("push_subscriptions").select("user_id, user_agent").eq("endpoint", body.endpoint).maybeSingle();
    if (data) {
      userId = data.user_id;
      device = deviceLabel(body.endpoint, data.user_agent);
    }
  }
  if (!userId) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data } = token ? await admin.auth.getUser(token) : { data: null };
    userId = data?.user?.id ?? null;
    device = deviceLabel(body.endpoint ?? "", ua);
  }
  if (!userId) return Response.json({ error: "Unknown device." }, { status: 401 });
  if (!DEVICE_STAGES.has(stage) && !SETUP_STAGES.has(stage)) return Response.json({ error: "Bad stage." }, { status: 400 });

  await logPushEvents(admin, [{ push_id: pid, user_id: userId, device, stage, detail: body.detail ?? null }]);
  return Response.json({ ok: true });
}
