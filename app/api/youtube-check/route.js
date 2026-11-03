// Checks which YouTube video ids really exist (AI chat apps often invent links).
// Uses YouTube's public oEmbed endpoint: 200 = real, embeddable video; anything else = drop it.
const MAX = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).filter((id) => typeof id === "string" && /^[\w-]{11}$/.test(id)))].slice(0, MAX);

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, {
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 86400 },
        });
        return res.ok ? id : null;
      } catch {
        return null;
      }
    }),
  );
  return Response.json({ valid: results.filter(Boolean) });
}
