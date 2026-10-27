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

/** The button of a group: one place for all its actions, else none (each
 * line then carries its own). */
export function groupAction(
  projectId: string,
  items: Array<{ kind: PlanItemKind }>,
): { href: string; label: string } | null {
  const hrefs = new Set(
    items.map((item) => legalActionHref(projectId, item.kind)),
  );
  if (items.length === 0 || hrefs.size !== 1) return null;
  return { href: [...hrefs][0], label: legalActionLabel(items[0].kind) };
}
