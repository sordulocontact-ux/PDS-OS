import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import {
  productionStepChoices,
  productionStepRef,
} from "@/lib/production/journey/step-ref";
import type { JourneyStep } from "@/lib/production/journey/types";
import { isLocked } from "@/lib/ui/journey";

/**
 * A step of a deliverable's production on the common pattern (proto
 * `detail`): its card (`StepPanel`), the blockers reported on it at the
 * top, its content, who it waits for, then « Informations notées » and « Signaler un
 * blocage » / « Noter une information » for the team (sub-lot C6), never
 * on a locked step nor once the production is closed.
 */
export async function ProductionStepPanel({
  projectId,
  deliverableId,
  step,
  steps,
  closed = false,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  deliverableId: string;
  step: JourneyStep;
  steps: JourneyStep[];
  closed?: boolean;
  children?: React.ReactNode;
}) {
  const stepRef = productionStepRef(projectId, deliverableId, step.key);
  const choices = productionStepChoices(deliverableId, steps);
  return (
    <StepPanel step={step} steps={steps} {...slots}>
      <StepBlockers stepRef={stepRef} steps={choices} />
      {children}
      {/* Who the step waits for, when it is not the viewer (proto waitRow). */}
      {!isLocked(step.status) && <StepWaiting step={step} />}
      <StepToolsBlock
        stepRef={stepRef}
        steps={choices}
        locked={isLocked(step.status)}
        closed={closed}
      />
    </StepPanel>
  );
}
