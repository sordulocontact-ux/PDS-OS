import { AccordionSteps } from "@/components/shell/accordion-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type {
  DimensionStatus,
  StrategyDimension,
} from "@/lib/strategy/dimensions";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

// Answered by one form whose « Enregistrer » folds the dimension back
// (StrategyChoices); the others are lists, closed with « Terminé ».
const ANSWER_DIMENSIONS: StrategyDimension[] = [
  "positioning",
  "audiences",
  "narrative",
];

/**
 * The pilotage of the Stratégie (ticket § 2): its eight dimensions in a
 * vertical list, each with its name, a summary and its state, all written
 * by code. A row unfolds its dimension in place, chevron on the right, one
 * at a time; the URL names it (?d=) so a reload, the Brief or the Planning
 * find it open. Saving an answer folds it back (useCloseAccordion).
 */
export function StrategyPilotage({
  projectId,
  statuses,
  current,
  children,
}: {
  projectId: string;
  statuses: DimensionStatus[];
  // The unfolded dimension, if any, and its work rendered by the server.
  current: StrategyDimension | null;
  children?: React.ReactNode;
}) {
  const t = fr.strategyPilot;
  return (
    <AccordionSteps
      label={t.listLabel}
      idPrefix="dimension"
      steps={statuses.map((d) => ({
        key: d.key,
        title: t.dimensions[d.key],
        summary: d.summary,
        state: {
          label: t.states[d.state],
          tone: strategyDimensionTone[d.state],
        },
        href: routes.projectStrategyDimension(projectId, d.key),
      }))}
      current={current}
      closeHref={routes.projectStrategy(projectId)}
      description={current ? t.purposes[current] : undefined}
      doneLabel={
        current && !ANSWER_DIMENSIONS.includes(current) ? t.done : undefined
      }
    >
      {children}
    </AccordionSteps>
  );
}
