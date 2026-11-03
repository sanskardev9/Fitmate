// Server endpoints only handle work that needs the server (PDF parsing, progression,
// import validation). Plan CRUD goes straight to IndexedDB from the browser.
export async function POST() {
  return Response.json({ error: "Not implemented yet (Phase 4)." }, { status: 501 });
}
