import { loadStepTools } from "@/lib/step-tools/queries";
import {
  openContradictions,
  sameStep,
  type StepChoice,
  type StepRef,
} from "@/lib/step-tools/model";

import { BlockerCallout, ContradictionCallout } from "./blocker-callout";
import { StepNotes } from "./step-notes";
import { StepTools } from "./step-tools";

/**
 * The open blockers of a step, near its top (proto `detail`: after the
 * « Se débloque quand… », before the body): each signalled blocker, and each
 * contradiction one of its notes is part of. Server component: reads the
 * project's blockers once per request (`loadStepTools`).
 */
export async function StepBlockers({
  stepRef,
  steps,
}: {
  stepRef: StepRef;
  steps?: StepChoice[];
}) {
  const tools = await loadStepTools(stepRef.projectId);
  const open = tools.blockers.filter((b) => !b.lifted && sameStep(b, stepRef));
  const contradictions = openContradictions(tools.notes).filter((list) =>
    list.some((n) => sameStep(n, stepRef)),
  );
  if (open.length === 0 && contradictions.length === 0) return null;
  const dialog = {
    stepRef,
    steps,
    notes: tools.notes,
    canDecide: tools.canDecide,
    canWrite: tools.canWrite,
  };
  return (
    <div className="flex flex-col gap-3">
      {open.map((b) => (
        <BlockerCallout key={b.id} projectId={stepRef.projectId} blocker={b} />
      ))}
      {contradictions.map((list) => (
        <ContradictionCallout
          key={list[0].id}
          notes={list}
          owner={tools.ownerName}
          dialog={dialog}
        />
      ))}
    </div>
  );
}

/**
 * The bottom of a step (proto `detail`): « Informations notées », then
 * « Signaler un blocage » / « Noter une information » for the team — never
 * on a locked step (`locked`) nor in a closed module (`closed`).
 */
export async function StepToolsBlock({
  stepRef,
  steps,
  locked = false,
  closed = false,
}: {
  stepRef: StepRef;
  steps?: StepChoice[];
  locked?: boolean;
  closed?: boolean;
}) {
  const tools = await loadStepTools(stepRef.projectId);
  const notes = tools.notes.filter((n) => sameStep(n, stepRef));
  return (
    <div className="flex flex-col gap-4">
      <StepNotes
        projectId={stepRef.projectId}
        notes={notes}
        allNotes={tools.notes}
        canDecide={tools.canDecide}
      />
      {tools.canWrite && !locked && !closed && (
        <StepTools stepRef={stepRef} steps={steps} notes={tools.notes} />
      )}
    </div>
  );
}
