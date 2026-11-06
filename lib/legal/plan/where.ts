// Where each kind of action of the Juridique's plan is done, and the button
// that leads there: the same in the Plan, the Suivi and the Travail (Sacha's
// feedback of 05/10/2026: « on peut lancer mais on ne sait pas comment
// faire »). Client-safe.

import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import type { PlanItemKind } from "@/lib/legal/plan/proposal";

const fr = { legal };

export function legalActionHref(projectId: string, kind: PlanItemKind): string {
  switch (kind) {
    case "onboarding":
      return routes.projectLegalStep(projectId, "forms");
    case "contract":
      return routes.projectLegalStep(projectId, "contracts");
    case "splits":
      return routes.projectLegalStep(projectId, "splits");
    case "formality":
      return routes.projectLegalStep(projectId, "formalities");
    case "clearance":
      return routes.projectLegalStep(projectId, "clearances");
  }
}

export const legalActionLabel = (kind: PlanItemKind) => fr.legal.plan.go[kind];

export const isPlanItemKind = (value: string): value is PlanItemKind =>
  ["onboarding", "contract", "splits", "clearance", "formality"].includes(
    value,
  );
