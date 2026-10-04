import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The steps of the Juridique process (Figma "PDS OS", node 1510:3096), each
// its own URL: the first is the section's entry (/legal), the others a
// segment below it. Empty pages for now: no state yet, every step opens.
export const LEGAL_STEP_KEYS = [
  "inventory",
  "people",
  "rights",
  "contracts",
] as const;

export type LegalStepKey = (typeof LEGAL_STEP_KEYS)[number];

export const legalStepHref = (projectId: string, key: LegalStepKey) =>
  key === LEGAL_STEP_KEYS[0]
    ? routes.projectLegal(projectId)
    : routes.projectLegalStep(projectId, key);

export const legalStepLabel = (key: LegalStepKey) =>
  fr.shell.project.legalSteps[key];

export const isLegalStepSegment = (segment: string): boolean =>
  LEGAL_STEP_KEYS.slice(1).some((key) => key === segment);
