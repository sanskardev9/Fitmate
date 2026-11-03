// Hands a parsed PDF plan from the import page to a builder for review. sessionStorage keeps it
// out of the database until the user saves, and survives the route change.
const key = (kind) => `fitmate:draft:${kind}`;

export function saveDraft(kind, draft) {
  sessionStorage.setItem(key(kind), JSON.stringify(draft));
}

export function takeDraft(kind) {
  try {
    const raw = sessionStorage.getItem(key(kind));
    sessionStorage.removeItem(key(kind));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
