// The outcome of a write from a dialog or a button: an error already in
// French. Every domain's result type with this shape fits (PrepResult…).
export type WriteResult = { ok: true } | { ok: false; error: string };
