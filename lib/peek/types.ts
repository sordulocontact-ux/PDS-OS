// A record's preview in a modal (RecordPeek). Client-safe.

export const PEEK_KINDS = ["artist", "contact", "contract"] as const;
export type PeekKind = (typeof PEEK_KINDS)[number];

/** Which record a row previews, decided by the server. */
export type PeekTarget = { kind: PeekKind; id: string };

export type RecordPeek = {
  kind: PeekKind;
  title: string;
  // An artist's picture, when there is one.
  pictureUrl: string | null;
  // Its full page, reached only from « Voir la fiche ».
  href: string;
  facts: Array<{ label: string; value: string }>;
};
