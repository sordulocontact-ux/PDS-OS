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
