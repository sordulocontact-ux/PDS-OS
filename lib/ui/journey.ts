// The generic journey of a module (docs/VISION-UX.md § 4, proto « Projet
// complet »): steps, their state, who acts now, what they need and what
// follows. Every workflow's loader returns JourneyStep[] (Production,
// Juridique, then each zone); lib/journey/project.ts gathers them.
// Statuses are computed by code, never stored, never written by PO.
// Client-safe.

/**
 * - done: finished; its subtitle says what it gave.
 * - current: open, someone acts on it now.
 * - waiting: open, waiting for an answer from someone (a contact's gesture,
 *   a validation asked): warning tone, « En attente de X ».
 * - rework: to review after a change elsewhere (« À revoir »).
 * - blocked: locked, its prerequisites are not done (« Se débloque quand… »,
 *   read-only). Not to be confused with `JourneyStep.blocked`, a blocker
 *   someone reported on an open step.
 * - upcoming: later, not locked by a prerequisite but not open yet.
 * - obsolete: no longer needed (struck through).
 */
export type JourneyStatus =
  | "done"
  | "current"
  | "waiting"
  | "rework"
  | "blocked"
  | "upcoming"
  | "obsolete";

/** Open steps: someone may act on them. */
export const OPEN_STATUSES: readonly JourneyStatus[] = [
  "current",
  "waiting",
  "rework",
];

/** Locked steps: visible, readable, nothing to do (VISION-UX § 4). */
export const isLocked = (status: JourneyStatus) =>
  status === "blocked" || status === "upcoming";

/** Someone who holds a role: a member of PDS, or a contact through a link. */
export type JourneyPerson = { name: string; viewer: boolean; viaLink: boolean };

/**
 * Who acts now on an open step, and what. `kind`: « validate » when the
 * action is a decision (the project's Validations list them), else « do ».
 */
export type JourneyActor = JourneyPerson & {
  todo: string;
  kind?: "do" | "validate";
};

/**
 * A role on a step, for the grid of the open step: Exécute / Coordonne /
 * Valide (Cadrage, Marketing: 5 columns), or Responsable / Validation
 * (Master, Juridique, Distribution: 4 columns). The grid is deduced from
 * the kinds present: any `exec` or `coord` → 5 columns.
 */
export type JourneyRole = {
  kind: "exec" | "coord" | "valid" | "owner";
  name: string;
  // « Responsable du projet », « Ingénieur du son ».
  role: string;
  viaLink?: boolean;
};

/**
 * A prerequisite resolved by the loader, possibly in another module
 * (« Marketing › Échange stratégique »), with where it comes from
 * (« Plan du projet · fait le 18/10 »).
 */
export type JourneyPrereq = {
  key: string;
  label: string;
  done: boolean;
  // The other module's name, when it is not this journey's.
  module?: string;
  source?: string;
};

/** What follows a step in another module (« Distribution › Dossier »). */
export type JourneyNext = { key: string; label: string; module?: string };

export type JourneyStep = {
  key: string;
  href: string;
  title: string;
  why: string;
  status: JourneyStatus;
  // The 4-column grid's Responsable and Validation (kept for the loaders
  // that do not give `roles`).
  owner: { name: string; role: string } | null;
  validator: { name: string; role: string } | null;
  // When given, the grid reads these instead of owner / validator.
  roles?: JourneyRole[];
  // Keys of prerequisite steps of the same journey…
  prereq: string[];
  // …and the ones of other modules, resolved by the loader.
  external?: JourneyPrereq[];
  // Keys of the steps of this journey it unlocks, then the ones elsewhere.
  next: string[];
  nextExternal?: JourneyNext[];
  actor: JourneyActor | null;
  // What a done step gave (« Échange du 05/10 »).
  summary: string | null;
  // Intertitle of the journey this step sits under (« Dossier »).
  group?: string;
  // Red subtitle in the journey: a missed due date, a decision required,
  // sources that block it (the subtitle is then its summary alone).
  alert?: "overdue" | "decision" | "blocking";
  // Done, but not « clean »: closed with reserves (warning mark, never
  // green; proto Distribution).
  reserve?: boolean;
  // ISO date the step is due (« avant le Sam. 05/12/2026 »).
  due?: string | null;
  // A blocker was reported on it (stop icon after its title).
  blocked?: boolean;
};

/** The step's prerequisites, this journey's then the others', resolved. */
export function prereqsOf(
  step: JourneyStep,
  steps: readonly JourneyStep[],
): JourneyPrereq[] {
  const own = step.prereq.flatMap((key) => {
    const s = steps.find((x) => x.key === key);
    return s ? [{ key, label: s.title, done: s.status === "done" }] : [];
  });
  return [...own, ...(step.external ?? [])];
}

/** What the step unlocks, this journey's then the others'. */
export function nextOf(
  step: JourneyStep,
  steps: readonly JourneyStep[],
): JourneyNext[] {
  const own = step.next.flatMap((key) => {
    const s = steps.find((x) => x.key === key);
    return s ? [{ key, label: s.title }] : [];
  });
  return [...own, ...(step.nextExternal ?? [])];
}

/** « Module › Étape » when it is elsewhere, the label alone here. */
export const withModule = (item: { label: string; module?: string }) =>
  item.module ? `${item.module} › ${item.label}` : item.label;

/** The viewer's own open actions first, then what others are expected to do. */
export function nowOf<S extends JourneyStep>(
  steps: S[],
): { mine: S[]; waiting: S[] } {
  const open = steps.filter((s) => s.actor);
  return {
    mine: open.filter((s) => s.actor?.viewer),
    waiting: open.filter((s) => !s.actor?.viewer),
  };
}

/** « valider le Mix V1 »: only the first letter lowered (proto `low`), so
 * names and versions keep their capitals inside a sentence. */
export const lowerFirst = (text: string | null | undefined): string =>
  text ? text.charAt(0).toLowerCase() + text.slice(1) : (text ?? "");
