import { routes } from "@/lib/auth/redirects";

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

// Two pages hold the five steps (Sacha, 07/10/2026: « la partie juridique
// est très compliquée »): the État des lieux holds the Cadrage's questions
// and the Confirmation; the Plan d'action becomes the Suivi once launched,
// and opens the branches. The old URLs still answer, by a redirect. The
// chevrons show the DG's five steps (ticket « Architecture globale » § 7).
type LegalPage = "inventory" | "plan";

export const legalTabOf = (page: LegalStepKey | LegalBranchPage): LegalPage =>
  page === "inventory" || page === "framing" || page === "confirmation"
    ? "inventory"
    : "plan";

/** Where the dossier stands: the first of the DG's five steps not done
 * (`done` from lib/workflow-status/rules.ts, legalState). */
export function legalPhase(done: readonly LegalStepKey[]): LegalStepKey {
  if (!done.includes("framing")) return "framing";
  if (!done.includes("confirmation")) return "confirmation";
  if (!done.includes("plan")) return "plan";
  return "tracking";
}

// Anchors of the État des lieux, where the Cadrage juridique's questions and
// the Confirmation live (app/.../legal/[[...step]]/page.tsx).
export const LEGAL_ANCHORS = {
  framing: "legal-questions",
  confirmation: "legal-dossier",
} as const;

/** Where each of the five steps is done: the first three on the État des
 * lieux (the last two at their block), the Plan d'action and the Suivi on
 * the plan's page, which becomes the Suivi once launched. */
export function legalChevronHref(projectId: string, key: LegalStepKey) {
  const base = routes.projectLegal(projectId);
  if (key === "framing" || key === "confirmation")
    return `${base}#${LEGAL_ANCHORS[key]}`;
  return key === "inventory"
    ? base
    : routes.projectLegalStep(projectId, "plan");
}

/** The step a Juridique page stands on (its chevron in ink): on the État
 * des lieux, the dossier's own step when the page holds it; on the plan's
 * pages, the Plan d'action, or the Suivi once launched. */
export function legalCurrentStep(
  page: LegalStepKey | LegalBranchPage,
  done: readonly LegalStepKey[],
): LegalStepKey {
  if (legalTabOf(page) === "plan")
    return done.includes("plan") ? "tracking" : "plan";
  const phase = legalPhase(done);
  return phase === "framing" || phase === "confirmation" ? phase : "inventory";
}
