const KEY = "feedback-board:voter-id";

// The anonymous ID this browser votes with. It's kept in local storage, so it survives reloads and
// restarts; a browser without working storage gets a fresh ID for this visit only.
export function voterId(storage: Pick<Storage, "getItem" | "setItem"> | undefined): string {
  try {
    const saved = storage?.getItem(KEY);
    if (saved) return saved;
    const created = crypto.randomUUID();
    storage?.setItem(KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}
