import { MessagesSection } from "@/components/activations/messages/messages-section";
import { AddTargetButton } from "@/components/activations/targets/add-target-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadMessages } from "@/lib/activations/messages/queries";
import { loadPressKit } from "@/lib/activations/press-kit";
import { loadOpportunities } from "@/lib/activations/press/queries";
import { loadTargets } from "@/lib/activations/targets";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";

import { PrepareDraftsButton } from "./prepare-drafts-button";
import { PressTargetsTable } from "./press-targets-table";

const t = fr.activationPress;

/**
 * RP in house : the common template (validated once, then one draft per
 * target) and the targets of the Réseau with the real state of their
 * messages, opportunities and coverage.
 */
export async function PressTargetsSection({
  fiche,
}: {
  fiche: ActivationFiche;
}) {
  const { activation: a, project, board, members, canWrite } = fiche;
  const [targets, messages, opportunities, kit] = await Promise.all([
    loadTargets(a.id),
    loadMessages(a.id),
    loadOpportunities(a.id),
    loadPressKit(project.id),
  ]);
  const template = messages.filter(
    (m) => m.targetId === null && m.kind === "pitch",
  );
  const covered = new Set(
    messages.flatMap((m) =>
      m.targetId && m.kind === "pitch" && m.status !== "cancelled"
        ? [m.targetId]
        : [],
    ),
  );
  const toPrepare = targets.filter(
    (x) => !x.outcome && !covered.has(x.id),
  ).length;
  const templateValidated = template.some((m) => m.status === "validated");

  return (
    <div className="grid gap-8">
      <MessagesSection
        projectId={project.id}
        activationId={a.id}
        targetId={null}
        messages={template}
        kinds={["pitch"]}
        defaults={{
          kind: "pitch",
          subject: t.template.subject(project.title),
          body: t.template.body(project.title, project.artistName),
        }}
        pressKitId={kit.approved?.id ?? null}
        members={members}
        canWrite={canWrite}
        today={todayInParis()}
        title={t.template.title}
      />
      {canWrite && templateValidated && toPrepare > 0 && (
        <div className="-mt-4 flex justify-end">
          <PrepareDraftsButton
            projectId={project.id}
            activationId={a.id}
            count={toPrepare}
          />
        </div>
      )}
      <PageSection
        id="targets"
        title={t.targets.title}
        description={t.targets.description}
        action={
          canWrite && (
            <AddTargetButton projectId={project.id} activationId={a.id} press />
          )
        }
      >
        {targets.length === 0 ? (
          <EmptyNote>{fr.activationWork.targets.noTargets}</EmptyNote>
        ) : (
          <PressTargetsTable
            projectId={project.id}
            activationId={a.id}
            targets={targets}
            messages={messages}
            opportunities={opportunities}
            evidences={board.data.evidences}
          />
        )}
      </PageSection>
    </div>
  );
}
