import { NewActivationButton } from "@/components/activations/new-activation-button";
import { ProjectHeader } from "@/components/projects/project-header";
import { EmptyNote } from "@/components/shell/empty-state";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
import { loadActivationsBoard } from "@/lib/activations/board";
import type { ActivationFilter } from "@/lib/activations/journey";
import { loadLevers } from "@/lib/activations/levers";
import { loadActivationPeople } from "@/lib/activations/people";
import {
  titleScopeCovers,
  titleScopeLabel,
} from "@/lib/projects/title-scope-rules";
import { loadTitleScopes, scopeOf } from "@/lib/projects/title-scopes";
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
 * right): the Marketing's head, « Maintenant » only when the viewer has a
 * gesture on an activation's page (the levers are the page itself, Sacha
 * 10/11/2026), the levers of the Brief de sortie still to turn into activations on their
 * card, then the table of the activations. A row opens the activation's own
 * page (ActivationPageView). Everything computed at each read.
 */
export async function ActivationsIndex({
  projectId,
  filter,
  titleId = null,
}: {
  projectId: string;
  filter: ActivationFilter;
  // A collective (lot 10): the title the list is filtered on (`?titre=`).
  titleId?: string | null;
}) {
  const [access, project, board, people, journeys, scopes] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadActivationsBoard(projectId),
    loadActivationPeople(projectId),
    activationsJourneys(projectId),
    loadTitleScopes(projectId),
  ]);
  const levers = await loadLevers(projectId, board.data.activations);
  const canCreate = canEditProject(access, project);
  const steps =
    journeys.find((j) => j.part?.key === "activations")?.steps ?? [];
  // « À vous » only for a gesture on an activation's page (Sacha 10/11/2026,
  // Claire: « vérifier la preuve »): never for the levers, on this page, and
  // never a card of who is awaited — a list page stays a list otherwise.
  const elsewhere = steps.some((s) => s.actor?.viewer && s.key !== "levers");
  const viewerName =
    personName(access.firstName ?? "", access.lastName ?? "") || null;
  const rows = board.summaries.map((a) => ({
    ...a,
    ownerName: a.ownerPersonId ? people.person(a.ownerPersonId).name : null,
    // A collective: the titles it targets, in words (lot 10).
    scope: scopes
      ? titleScopeLabel(scopeOf(scopes.activations, a.id), scopes.titles)
      : null,
  }));
  // Filtered on a live title of the collective (an unknown one: no filter).
  const title =
    scopes?.titles.find((x) => x.id === titleId && !x.abandoned) ?? null;
  const shown = title
    ? rows.filter((a) =>
        titleScopeCovers(scopeOf(scopes!.activations, a.id), title.id),
      )
    : rows;
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader projectId={projectId} />
      {elsewhere && (
        <ProjectNowCard
          projectId={projectId}
          steps={steps}
          viewerName={viewerName}
          moduleLabel={t.crumb}
          shownKey="levers"
          here={steps}
        />
      )}
      <LeversCard projectId={projectId} levers={levers} canCreate={canCreate} />
      {rows.length > 0 ? (
        <ActivationsTable
          projectId={projectId}
          rows={shown}
          filter={filter}
          titles={
            scopes
              ? {
                  options: scopes.titles.filter((x) => !x.abandoned),
                  current: title?.id ?? null,
                }
              : null
          }
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
