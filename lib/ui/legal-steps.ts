import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The internal path of the Juridique workflow, as the DG defined it
// (docs/CONTEXTE-PROJET.md § 2) — its own, never the project's 7 steps. Each
// step has its own URL: the first is the section's entry (/legal), the
// others a segment below it.
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

/** The built step or branch page a URL's segments open: none = the first
 * step; anything else (unknown, not built, deeper) = null, a 404. */
export function builtLegalStepOf(
  segments: string[] | undefined,
): LegalStepKey | LegalBranchPage | null {
  if (!segments || segments.length === 0) return LEGAL_STEP_KEYS[0];
  if (segments.length > 1) return null;
  return (
    LEGAL_BUILT_STEPS.find(
      (key) => key !== LEGAL_STEP_KEYS[0] && key === segments[0],
    ) ??
    LEGAL_BRANCH_PAGES.find((key) => key === segments[0]) ??
    null
  );
}

// What the person sees (Sacha, 07/10/2026: « la partie juridique est très
// compliquée »): two steps instead of five steps and five dossiers. The
// État des lieux holds the Cadrage's questions and the Confirmation on the
// same page; the Plan d'action becomes the Suivi once launched, and opens
// the branches. The old URLs still answer, by a redirect.
export const LEGAL_TABS = ["inventory", "plan"] as const;
export type LegalTab = (typeof LEGAL_TABS)[number];

export const legalTabOf = (page: LegalStepKey | LegalBranchPage): LegalTab =>
  page === "inventory" || page === "framing" || page === "confirmation"
    ? "inventory"
    : "plan";

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
  key === LEGAL_STEP_KEYS[0]
    ? routes.projectLegal(projectId)
    : routes.projectLegalStep(projectId, key);

export const legalStepLabel = (key: LegalStepKey) =>
  fr.shell.project.legalSteps[key];
