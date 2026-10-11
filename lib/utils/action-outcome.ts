/**
 * The outcome of a write whose refusal is already a sentence in French
 * (Production, Marketing › Suivi & bilan): shown as is next to the button
 * that asked for it.
 */
export type ActionOutcome = { ok: true } | { ok: false; error: string };
