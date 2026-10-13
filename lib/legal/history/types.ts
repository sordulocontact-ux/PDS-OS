// The Historique du Juridique (JUR-29): one line per event really recorded,
// read from the append-only journals and the instants of each branch —
// never rewritten, never invented. Client-safe.

export const HISTORY_BRANCHES = [
  "inventory",
  "plan",
  "forms",
  "contracts",
  "splits",
  "clearances",
  "formalities",
] as const;
export type HistoryBranch = (typeof HISTORY_BRANCHES)[number];

export function isHistoryBranch(value: unknown): value is HistoryBranch {
  return (
    typeof value === "string" &&
    (HISTORY_BRANCHES as readonly string[]).includes(value)
  );
}

export type LegalEvent = {
  // Unique across journals ("contract:<id>").
  id: string;
  // The recorded instant (UTC, timestamptz).
  at: string;
  branch: HistoryBranch;
  // What happened, in words.
  action: string;
  // What it is about (a person, a title, a contract), when known.
  subject: string | null;
  // Who did it; « via son lien » for a person outside the team, « auto »
  // for what the database did itself.
  by: string | null;
  note: string | null;
  // A proof typed in a free field, said « non vérifiée ».
  manualProof: string | null;
  // Where the object is.
  href: string | null;
  // The journal's own kind ("contract.revised", "form.sent"…) and the
  // object it belongs to ("contract:<id>"): what the causes are read from.
  kind: string;
  object: string | null;
  // A document's version the event is about (a SACEM signature).
  version?: number;
  // JUR-29: the earlier event of the same object it follows, and what it
  // made void — computed by rule (lib/legal/history/causes.ts).
  causeId?: string;
  consequence?: string;
};

export type LegalHistory = { events: LegalEvent[]; complete: boolean };
