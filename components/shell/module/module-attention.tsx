import { routes } from "@/lib/auth/redirects";
import { stepHref } from "@/lib/step-tools/href";
import {
  attentionOf,
  openContradictions,
  type StepChoice,
  type StepModule,
  type StepRef,
} from "@/lib/step-tools/model";
import { loadStepTools } from "@/lib/step-tools/queries";

import { AttentionChips } from "./attention-chips";

/**
 * The attention chips of a module (or of the whole project without
 * `modules`), read from the project's blockers and notes, plus the open
 * blockers of the Activations. `review`: the « éléments à revoir » the
 * module counts itself (they open Travail).
 */
export async function ModuleAttention({
  stepRef,
  modules,
  steps,
  review = 0,
}: {
  // Where a note written from the dialog goes by default.
  stepRef: StepRef;
  modules?: StepModule[];
  steps?: StepChoice[];
  review?: number;
}) {
  const tools = await loadStepTools(stepRef.projectId);
  const mine = <T extends { module: StepModule }>(list: T[]) =>
    modules ? list.filter((x) => modules.includes(x.module)) : list;
  const blockers = mine(tools.blockers).filter((b) => !b.lifted);
  const notes = mine(tools.notes);
  const count = attentionOf(
    blockers,
    notes,
    !modules || modules.includes("activations") ? tools.activationBlockers : 0,
  );
  const first = blockers[0] ?? openContradictions(notes)[0]?.[0];
  return (
    <AttentionChips
      blockers={count.blockers}
      blockersHref={first ? stepHref(stepRef.projectId, first) : undefined}
      review={review}
      reviewHref={routes.projectWork(stepRef.projectId)}
      toConfirm={count.toConfirm}
      dialog={{
        stepRef,
        steps,
        notes: tools.notes,
        canDecide: tools.canDecide,
        canWrite: tools.canWrite,
      }}
    />
  );
}
