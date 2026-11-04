import { ImageResponse } from "next/og";

export const runtime = "edge";

const clip = (v, n) => String(v ?? "").slice(0, n);
const num = (v) => Math.max(0, Math.min(9999, parseInt(v, 10) || 0));

// Picture shown in big Android / Windows notifications (720×360). Only numbers and short labels
// from the query are drawn, and only these layouts exist, so it can't render arbitrary pages.
export function GET(request) {
  const q = new URL(request.url).searchParams;
  const kind = q.get("k");
  const n = num(q.get("n"));
  const freezes = num(q.get("f"));

  const bg = kind === "workout" ? "linear-gradient(135deg, #059669 0%, #047857 55%, #064e3b 100%)" : "linear-gradient(135deg, #f97316 0%, #ea580c 55%, #9a3412 100%)";
  const flame = (
    <svg width="150" height="150" viewBox="0 0 24 24">
      <path d="M12 2c.6 3.2 3.4 4.7 4.9 7.4 1.2 2.1 1.6 4.6.6 6.9A6.4 6.4 0 0112 22a6.4 6.4 0 01-5.5-5.7c-.3-2.4.6-4.3 2-5.9.3 1.4 1 2.4 2 2.9C10.2 9.8 10.6 5.6 12 2z" fill="#fff" />
      <path d="M12 12.5c.3 1.6 1.8 2.3 2.2 3.8.4 1.6-.6 3.4-2.2 3.7-1.7.3-3-1-3-2.6 0-1.3.8-2.2 1.6-2.9.1.7.4 1.2.9 1.5-.2-1.5.1-2.6.5-3.5z" fill="#fdba74" />
    </svg>
  );
  const dumbbell = (
    <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
      <path d="M8 7v10M16 7v10M5 10v4M19 10v4M8 12h8" />
    </svg>
  );

  let headline, sub;
  if (kind === "workout") {
    headline = clip(q.get("t"), 40) || "Workout day";
    sub = clip(q.get("s"), 60) || "Your plan is ready";
  } else if (kind === "last") {
    headline = `${n}-day streak`;
    sub = `${clip(q.get("m"), 10)} left · ends at midnight`;
  } else {
    headline = n ? `${n}-day streak` : "Start a streak";
    sub = freezes ? `${freezes} streak freeze${freezes === 1 ? "" : "s"} saved` : "Follow today's plan to keep it";
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: bg, padding: "0 64px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", width: 210, height: 210, borderRadius: 48, background: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          {kind === "workout" ? dumbbell : flame}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, color: "#fff", maxWidth: 380 }}>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", opacity: 0.8, fontWeight: 600 }}>FitMate</div>
          <div style={{ fontSize: kind === "workout" ? 52 : 64, fontWeight: 800, lineHeight: 1.05, marginTop: 10, letterSpacing: -1.5 }}>{headline}</div>
          <div style={{ fontSize: 28, opacity: 0.88, marginTop: 14 }}>{sub}</div>
        </div>
      </div>
    ),
    { width: 720, height: 360, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
