import type { QuickAction } from "@/lib/shell/quick-actions";

export const SEARCH_GROUPS = [
  "page",
  "project",
  "artist",
  "master",
  "contact",
  "contract",
  "deal",
  "call",
  "session",
] as const;

export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export type SearchHit = {
  id: string;
  group: SearchGroup;
  label: string;
  // What tells the hit apart (a type, a day); may be empty.
  detail: string;
  href: string;
};

export type SearchResult = { hits: SearchHit[]; error: boolean };

/** A row of the « Créer » group: computed on the client from the shell's
 * quick actions, it opens a form instead of navigating. */
export type ActionRow = {
  id: string;
  group: "action";
  action: QuickAction;
  label: string;
};

/** What the ⌘K lists: server hits and client actions, in one keyboard run. */
export type SearchRow = SearchHit | ActionRow;
