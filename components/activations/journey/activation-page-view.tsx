import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
import { loadActivationsBoard } from "@/lib/activations/board";
import { loadActivationFiche } from "@/lib/activations/fiche";
import { loadLevers } from "@/lib/activations/levers";
import { loadActivationPeople } from "@/lib/activations/people";
import { phaseLabel } from "@/lib/activations/phase";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activations } from "@/lib/i18n/fr/activations";
import { activationsJourneys } from "@/lib/journey/activations";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import type { CrumbOption } from "@/lib/ui/module-frame";
import { allInOrder } from "@/lib/utils/parallel";

import { ActivationDetail } from "./activation-detail";

const fr = { activations, activationJourney };

const t = fr.activationJourney;

/**
 * One activation on its own page (Sacha 10/11/2026: an activation opens its
 * page, never below a list): the trail « Marketing / Activations /
 * <activation> », its double chevron switching to another activation;
 * « Maintenant » for the viewer's other gestures (this one's are in its
 * own); the activation over the whole width — its frieze, « Maintenant »,
 * its module, « Informations ». Its old sub-pages redirect to its anchors.
 */
export async function ActivationPageView({
  projectId,
  activationId,
}: {
  projectId: string;
  activationId: string;
}) {
  const [access, , board, people, journeys] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadActivationsBoard(projectId),
    loadActivationPeople(projectId),
    activationsJourneys(projectId),
  ]);
  const open = board.summaries.find((a) => a.id === activationId);
  if (!open) notFound();
  const [levers, fiche] = await Promise.all([
    loadLevers(projectId, board.data.activations),
    loadActivationFiche(projectId, open.id, access),
  ]);
  const all = journeys.find((j) => j.part?.key === "activations")?.steps ?? [];
  // This activation's own lines are in its « Maintenant ».
  // Its first step is keyed by its id, the others by « id:line ».
  const steps = all.filter(
    (s) => s.key !== open.id && !s.key.startsWith(`${open.id}:`),
  );
  const viewerName =
    personName(access.firstName ?? "", access.lastName ?? "") || null;
  const options: CrumbOption[] = board.summaries.map((a) => ({
    key: a.id,
    label: a.title,
    href: routes.projectActivation(projectId, a.id),
    detail: [fr.activations.kinds[a.kind], phaseLabel(a)].join(" · "),
    current: a.id === open.id,
    mine: a.actions.filter((x) => x.who.viewer).length,
  }));
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        extraCrumbs={[{ label: open.title, options }]}
      />
      <ProjectNowCard
        projectId={projectId}
        steps={steps}
        viewerName={viewerName}
        moduleLabel={t.crumb}
        here={all}
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
  );
}
