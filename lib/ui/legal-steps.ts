import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

// The internal path of the Juridique workflow, as the DG defined it
// (docs/CONTEXTE-PROJET.md § 2) — its own, never the project's 7 steps. Each
// step has its own URL, a segment below /legal (the section's entry, which
// redirects to the step that awaits the viewer).
export const LEGAL_STEP_KEYS = [
  "inventory",
  "framing",
  "confirmation",
  "plan",
  "tracking",
] as const;

export type LegalStepKey = (typeof LEGAL_STEP_KEYS)[number];

// Steps with a page so far; the others show greyed, not linked, and their
// URL answers 404 (one lot at a time, docs/ARCHITECTURE.md § 8 sexies).
export const LEGAL_BUILT_STEPS: readonly LegalStepKey[] = [
  "inventory",
  "framing",
  "confirmation",
  "plan",
  "tracking",
];

// Pages of a branch (tickets Juridique 02 to 06), reached from the plan
// and the Suivi, not steps of the path.
export const LEGAL_BRANCH_PAGES = [
  "forms",
  "contracts",
  "splits",
  "clearances",
  "formalities",
] as const;
export type LegalBranchPage = (typeof LEGAL_BRANCH_PAGES)[number];

// Each démarche of the plan is a step of the journey (proto « Projet
// complet », Juridique): a person's fiche and contract, a borrowing, a
// title's publishing split, a title's SACEM declaration. One URL each,
// /legal/<kind>/<ref>; then « Prêt pour la sortie » at /legal/ready.
export const LEGAL_DEMARCHE_KINDS = [
  "person",
  "clearance",
  "split",
  "sacem",
] as const;
export type LegalDemarcheKind = (typeof LEGAL_DEMARCHE_KINDS)[number];

export const LEGAL_READY_KEY = "ready";

// A collective's participations, their contracts and deals (lot 11 of
// docs/pds-mic-plan.md): a side panel over « Titres » (Sacha 27/11/2026:
// « une page pour ça c'est relou et overkill »), opened by this parameter
// so that a notification or a link still opens it. The former page
// (/legal/participations) redirects here.
export const LEGAL_PARTICIPATIONS_KEY = "participations";
export const PARTICIPATIONS_PARAM = "participations";

export const legalParticipationsHref = (
  projectId: string,
  view: "titles" | "tracks" = "titles",
) =>
  `${view === "tracks" ? routes.projectTracks(projectId) : routes.projectTitles(projectId)}?${PARTICIPATIONS_PARAM}=1`;

// A collective's title not in the Catalogue yet, in the journey of its
// group (/legal/attach/<project title id>): « Rattacher le titre au
// Catalogue », a step of the spine only (lib/legal/title-groups.ts).
export const LEGAL_ATTACH_SEGMENT = "attach";

export const legalAttachKey = (titleId: string) =>
  `${LEGAL_ATTACH_SEGMENT}:${titleId}`;

export const legalAttachHref = (projectId: string, titleId: string) =>
  `${routes.projectLegal(projectId)}/${LEGAL_ATTACH_SEGMENT}/${titleId}`;

// The contracts a collective's title needs, the first step of its group
// (/legal/title-contracts/<project title id>): confirmed once per title
// (lib/legal/title-groups.ts), a step of the spine only, like « attach ».
export const LEGAL_TITLE_CONTRACTS_SEGMENT = "title-contracts";

export const legalTitleContractsKey = (titleId: string) =>
  `${LEGAL_TITLE_CONTRACTS_SEGMENT}:${titleId}`;

export const legalTitleContractsHref = (projectId: string, titleId: string) =>
  `${routes.projectLegal(projectId)}/${LEGAL_TITLE_CONTRACTS_SEGMENT}/${titleId}`;

/** A démarche's ref as a URL segment: ids stay as they are, a person's key
 * (`contact:<id>`, `artist:<id>` or a normalized name) becomes a slug. */
export function legalRefSlug(ref: string): string {
  if (ref.startsWith("contact:")) return `c-${ref.slice(8)}`;
  if (ref.startsWith("artist:")) return `a-${ref.slice(7)}`;
  if (/^[0-9a-f-]{36}$/.test(ref)) return ref;
  return `n-${ref.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** The key of a démarche in the journey (« person:<ref> »). */
export const legalDemarcheKey = (kind: LegalDemarcheKind, ref: string) =>
  `${kind}:${ref}`;

export const legalDemarcheHref = (
  projectId: string,
  kind: LegalDemarcheKind,
  ref: string,
) => `${routes.projectLegal(projectId)}/${kind}/${legalRefSlug(ref)}`;

export type LegalRoute =
  | { type: "step"; key: LegalStepKey }
  | { type: "branch"; key: LegalBranchPage }
  | { type: "demarche"; kind: LegalDemarcheKind; slug: string }
  | { type: "ready" }
  | { type: "participations" }
  | { type: "attach"; titleId: string }
  | { type: "titleContracts"; titleId: string };

/** What a URL's segments below /legal open: a step of the Dossier, a
 * démarche, « Prêt pour la sortie » or a former branch page (redirected to
 * its démarche); none or unknown = null (the section's entry redirects
 * before asking). */
export function legalRouteOf(
  segments: string[] | undefined,
): LegalRoute | null {
  if (!segments || segments.length === 0 || segments.length > 2) return null;
  const [first, second] = segments;
  if (segments.length === 2) {
    if (first === LEGAL_ATTACH_SEGMENT)
      return { type: "attach", titleId: second };
    if (first === LEGAL_TITLE_CONTRACTS_SEGMENT)
      return { type: "titleContracts", titleId: second };
    const kind = LEGAL_DEMARCHE_KINDS.find((k) => k === first);
    return kind ? { type: "demarche", kind, slug: second } : null;
  }
  if (first === LEGAL_READY_KEY) return { type: "ready" };
  if (first === LEGAL_PARTICIPATIONS_KEY) return { type: "participations" };
  const step = LEGAL_BUILT_STEPS.find((key) => key === first);
  if (step) return { type: "step", key: step };
  const branch = LEGAL_BRANCH_PAGES.find((key) => key === first);
  return branch ? { type: "branch", key: branch } : null;
}

/** Where the dossier stands, in the DG's five words (ticket « Architecture
 * globale » § 7: « État des lieux > Cadrage juridique > Confirmation > Plan
 * d'action > Suivi »): a state shown on the page, never a chevron of its
 * own. `done` comes from lib/legal/steps-done.ts. */
export function legalPhase(done: readonly LegalStepKey[]): LegalStepKey {
  if (!done.includes("framing")) return "framing";
  if (!done.includes("confirmation")) return "confirmation";
  if (!done.includes("plan")) return "plan";
  return "tracking";
}

export const legalStepHref = (projectId: string, key: LegalStepKey) =>
  routes.projectLegalStep(projectId, key);

export const legalStepLabel = (key: LegalStepKey) =>
  fr.shell.project.legalSteps[key];
