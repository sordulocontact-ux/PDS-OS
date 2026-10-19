import { routes } from "@/lib/auth/redirects";

// Marketing › Suivi & bilan as a journey of three steps (proto « Projet
// complet », docs/ARCHITECTURE.md § 8 terdecies): Bilan provisoire,
// Réserves, Clôture du Marketing. Each has its URL (/review/bilan,
// /review/reserves, /review/closure); /review opens the step that waits for
// the person, /review/history the module's history. The former tabs
// (/review/reports, /review/reports/new) lead to the Bilan provisoire; a
// version keeps its own page (/review/reports/<id>: PDF, comparison).
export const REVIEW_STEP_KEYS = ["bilan", "reserves", "closure"] as const;

export type ReviewStepKey = (typeof REVIEW_STEP_KEYS)[number];

export const isReviewStepKey = (value: string): value is ReviewStepKey =>
  (REVIEW_STEP_KEYS as readonly string[]).includes(value);

export const reviewStepHref = (
  projectId: string,
  key: ReviewStepKey | "history",
) => `${routes.projectReview(projectId)}/${key}`;
