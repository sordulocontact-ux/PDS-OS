import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

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
  // The dossier's journal (JUR-29), reached from the head of the section.
  "history",
] as const;
export type LegalBranchPage = (typeof LEGAL_BRANCH_PAGES)[number];

/** The built step or branch page a URL's segments open: a single known
 * segment; none, unknown or deeper = null (the section's entry redirects
 * before asking). */
export function builtLegalStepOf(
  segments: string[] | undefined,
): LegalStepKey | LegalBranchPage | null {
  if (!segments || segments.length !== 1) return null;
  return (
    LEGAL_BUILT_STEPS.find((key) => key === segments[0]) ??
    LEGAL_BRANCH_PAGES.find((key) => key === segments[0]) ??
    null
  );
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
