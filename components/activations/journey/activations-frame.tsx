import { notFound } from "next/navigation";

import { NewActivationButton } from "@/components/activations/new-activation-button";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
import { loadActivationsBoard } from "@/lib/activations/board";
import { loadActivationFiche } from "@/lib/activations/fiche";
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

import { ActivationDetail } from "./activation-detail";
import { ActivationList } from "./activation-list";
import { LeversBanner } from "./levers-banner";

const fr = { activationJourney };

const t = fr.activationJourney;

/**
 * Marketing › Activations as one page (proto actPage, 18/10, « plus de
 * tableau ni d'onglets »): the Marketing's head with its pills, « Maintenant
 * » for the person looking, the levers of the Brief de sortie to turn into
 * activations, then the list on the left and the open activation on the
 * right. Everything computed at each read.
 */
export async function ActivationsFrame({
  projectId,
  openId,
  filter,
}: {
  projectId: string;
  openId: string | null;
  filter: ActivationFilter;
}) {
  const [access, project, board, people, journeys] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadActivationsBoard(projectId),
    loadActivationPeople(projectId),
    activationsJourneys(projectId),
  ]);
  const open = openId ? board.summaries.find((a) => a.id === openId) : null;
  if (openId && !open) notFound();
  const [levers, fiche] = await Promise.all([
    loadLevers(projectId, board.data.activations),
    open ? loadActivationFiche(projectId, open.id, access) : null,
  ]);
  const all = journeys.find((j) => j.part?.key === "activations")?.steps ?? [];
  // The open activation's other lines are in its « Maintenant ».
  const steps = all.filter((s) => !open || !s.key.startsWith(`${open.id}:`));
  const canCreate = canEditProject(access, project);
  const viewerName =
    personName(access.firstName ?? "", access.lastName ?? "") || null;
  const rows = board.summaries.map((a) => ({
    ...a,
    ownerName: a.ownerPersonId ? people.person(a.ownerPersonId).name : null,
  }));
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        extraCrumbs={[{ label: open ? open.title : t.levers.step }]}
      />
      <ProjectNowCard
        projectId={projectId}
        steps={steps}
        viewerName={viewerName}
        moduleLabel={t.crumb}
        shownKey={open?.id}
        here={all}
      />
      <LeversBanner
        projectId={projectId}
        levers={levers}
        canCreate={canCreate}
      />
      {rows.length === 0 ? (
        levers.items.length === 0 && (
          <p className="rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5 text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.banner.empty}
          </p>
        )
      ) : (
        <div className="grid items-start gap-6 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
          <ActivationList
            projectId={projectId}
            rows={rows}
            openId={open?.id ?? null}
            filter={filter}
            footer={
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
          {fiche && (
            <ActivationDetail
              fiche={fiche}
              access={access}
              people={people}
              briefVersion={levers.briefVersion}
            />
          )}
        </div>
      )}
    </div>
  );
}
