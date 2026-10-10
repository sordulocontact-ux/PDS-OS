// The strategy's documents (strategy_documents): kinds, and which version of
// a kind is the reference. Client-safe.

export const DOCUMENT_KINDS = ["brief", "release_plan", "press_kit"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

type Versioned = { kind: DocumentKind; state: string; version: number };

/** Versions of one kind, newest first (as loaded). */
export const versionsOf = <T extends Versioned>(
  docs: T[],
  kind: DocumentKind,
) => docs.filter((d) => d.kind === kind);

/** The reference of a kind: its latest approved version. */
export const approvedOf = <T extends Versioned>(
  docs: T[],
  kind: DocumentKind,
) => docs.find((d) => d.kind === kind && d.state === "approved") ?? null;

/** The version waiting for its reviewers, if any. */
export const sentOf = <T extends Versioned>(docs: T[], kind: DocumentKind) =>
  docs.find((d) => d.kind === kind && d.state === "sent") ?? null;

/** The latest version of a kind whatever its state, if any. */
export const latestOf = <T extends Versioned>(docs: T[], kind: DocumentKind) =>
  docs.find((d) => d.kind === kind && d.state !== "superseded") ?? null;

/** Every document has an approved version: the release's set is final. */
export const allFinalised = <T extends Versioned>(docs: T[]) =>
  DOCUMENT_KINDS.every((kind) => approvedOf(docs, kind));
