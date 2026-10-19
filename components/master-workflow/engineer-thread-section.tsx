import { EngineerThreadPanel } from "@/components/master-workflow/engineer-thread-panel";
import { todayInParis } from "@/lib/insights/dates";
import { loadEngineerMessages } from "@/lib/master-workflow/engineer-thread";
import type { StepView } from "@/lib/master-workflow/transmission";

/**
 * The thread with the engineer under a round of the Master (PROJ-AMEL-02):
 * the whole history of the project's links (it follows the engineer from
 * the mix to the mastering), answers going to this round's latest sending.
 */
export async function EngineerThreadSection({
  view,
  isDirection,
  direction,
}: {
  view: StepView;
  isDirection: boolean;
  direction: string;
}) {
  const messages = await loadEngineerMessages(view.projectId);
  return (
    <EngineerThreadPanel
      projectId={view.projectId}
      messages={messages}
      dates={
        view.brief?.dates ?? {
          mixV1Due: null,
          mixFinalDue: null,
          masteringDue: null,
          masterFinalDue: null,
        }
      }
      releaseDue={view.releaseDue}
      today={todayInParis()}
      replyTo={view.history[0]?.id ?? null}
      canEdit={view.canEdit}
      isDirection={isDirection}
      direction={direction}
      engineer={view.engineer?.name ?? view.history[0]?.engineer ?? ""}
    />
  );
}
