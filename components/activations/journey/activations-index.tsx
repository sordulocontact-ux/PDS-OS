import { NewActivationButton } from "@/components/activations/new-activation-button";
import { ProjectHeader } from "@/components/projects/project-header";
import { EmptyNote } from "@/components/shell/empty-state";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
import { loadActivationsBoard } from "@/lib/activations/board";
import type { ActivationFilter } from "@/lib/activations/journey";
import { loadLevers } from "@/lib/activations/levers";
import { loadActivationPeople } from "@/lib/activations/people";
import { requireApproved } from "@/lib/auth/dal";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activationsJourneys } from "@/lib/journey/activations";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

import { ActivationsTable } from "./activations-table";
import { LeversCard } from "./levers-card";

const fr = { activationJourney };

const t = fr.activationJourney;

/**
 * Marketing › Activations, the list (Sacha 10/11/2026, replacing the
 * single page of the 18/10 proto, list on the left and activation on the
 * right): the Marketing's head, « Maintenant » for the person looking, the
 * levers of the Brief de sortie still to turn into activations on their
 * card, then the table of the activations. A row opens the activation's own
 * page (ActivationPageView). Everything computed at each read.
 */
export async function ActivationsIndex({
  projectId,
  filter,
}: {
  projectId: string;
  filter: ActivationFilter;
}) {
  const [access, project, board, people, journeys] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadActivationsBoard(projectId),
    loadActivationPeople(projectId),
    activationsJourneys(projectId),
  ]);
  const levers = await loadLevers(projectId, board.data.activations);
  const steps =
    journeys.find((j) => j.part?.key === "activations")?.steps ?? [];
  const canCreate = canEditProject(access, project);
  const viewerName =
    personName(access.firstName ?? "", access.lastName ?? "") || null;
  const rows = board.summaries.map((a) => ({
    ...a,
    ownerName: a.ownerPersonId ? people.person(a.ownerPersonId).name : null,
  }));
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader projectId={projectId} />
      <ProjectNowCard
        projectId={projectId}
        steps={steps}
        viewerName={viewerName}
        moduleLabel={t.crumb}
        // The levers are on this page (LeversCard): « Maintenant » never
        // sends to them (Sacha 10/11/2026).
        shownKey="levers"
        here={steps}
      />
      <LeversCard projectId={projectId} levers={levers} canCreate={canCreate} />
      {rows.length > 0 ? (
        <ActivationsTable
          projectId={projectId}
          rows={rows}
          filter={filter}
          action={
            canCreate && (
              <NewActivationButton
                projectId={projectId}
                members={people.members}
                defaultOwnerId={project.ownerPersonId}
                quiet
              />
            )
          }
        />
      ) : (
        levers.items.length === 0 && <EmptyNote>{t.banner.empty}</EmptyNote>
      )}
    </div>
  );
}
