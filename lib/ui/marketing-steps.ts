import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The Marketing workflow (ticket « Architecture globale », 08/10/2026, § 4):
// Stratégie, Conception, Production, Activations, Suivi & bilan. An
// organisation, not a sequence: every step with a page opens on its own,
// except the Stratégie before the Plan du Projet launches it. A check comes
// from the project's stage (`stageKey`), never from the step's position.
// Production and Suivi & bilan got their page on 10/10/2026. The project's stages are
// unchanged (Défense keeps its stage, shown nowhere until it is decided).
const STEPS = [
  {
    key: "strategy",
    stageKey: "launch_strategy",
    href: routes.projectStrategy,
  },
  { key: "conception", stageKey: "design", href: routes.projectDesign },
  {
    key: "production",
    stageKey: "production",
    href: routes.projectProduction,
  },
  { key: "activations", stageKey: null, href: routes.projectActivations },
  // Checked by the Marketing's own closing (ticket « Suivi & bilan »), not
  // by the « review » stage, which closes the whole project.
  { key: "review", stageKey: null, href: routes.projectReview },
] as const;

/** Every page of the workflow: where its chevrons show. */
export const marketingPages = (projectId: string) =>
  STEPS.flatMap((step) => (step.href ? [step.href(projectId)] : []));

export function marketingSteps(
  projectId: string,
  {
    strategyLaunched,
    validatedStages,
    marketingClosed = false,
  }: {
    strategyLaunched: boolean;
    validatedStages: readonly string[];
    marketingClosed?: boolean;
  },
) {
  const t = fr.shell.project.marketingSteps;
  return STEPS.map((step) => {
    const locked = step.key === "strategy" && !strategyLaunched;
    return {
      key: step.key,
      label: t[step.key],
      href: step.href ? step.href(projectId) : "",
      built: step.href !== null && !locked,
      title: locked ? t.strategyLocked : undefined,
      // The Brief de sortie is a page of the Stratégie.
      also:
        step.key === "strategy"
          ? [routes.projectStrategyBrief(projectId)]
          : undefined,
      // Production, Conception, Activations and Suivi & bilan have pages
      // below their own (a deliverable's preparation; intentions, references,
      // sheets…; an activation; a report, the closing).
      nested:
        step.key === "production" ||
        step.key === "conception" ||
        step.key === "activations" ||
        step.key === "review",
      done:
        step.key === "review"
          ? marketingClosed
          : step.stageKey !== null && validatedStages.includes(step.stageKey),
    };
  });
}
