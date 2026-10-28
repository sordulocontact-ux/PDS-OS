import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { loadValidators } from "@/lib/framing/related";
import { todayInParis } from "@/lib/insights/dates";
import { loadClosures } from "@/lib/marketing/closure/queries";
import { loadApprovals } from "@/lib/marketing/reports/approvals";
import { listReports } from "@/lib/marketing/reports/queries";
import { loadReserves } from "@/lib/marketing/reserves/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { byProjectVersion } from "@/lib/projects/version-cache";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

import { loadReviewActivations } from "./activations";
import { reviewJourney } from "./journey";

/**
 * What every step of the Suivi & bilan shares, read once per request with
 * the viewer's session (RLS decides the rows): the project, its reports,
 * their decisions, the reserves, the closings, the activations and the
 * journey for the person looking.
 */
export const reviewJourneyContext = trackedCache(
  byProjectVersion("review-context", async (projectId: string) => {
    const [access, project] = await allInOrder([
      requireApproved(),
      requireLaunchedProject(projectId),
    ]);
    const [
      reports,
      approvals,
      reserves,
      closures,
      activations,
      flows,
      validators,
    ] = await Promise.all([
      listReports(projectId, access),
      loadApprovals(projectId, access),
      loadReserves(projectId, access),
      loadClosures(projectId, access),
      loadReviewActivations(projectId),
      loadWorkflowStates(projectId),
      access.organizationId
        ? loadValidators(access.organizationId)
        : Promise.resolve([]),
    ]);
    const owner = project.ownerPersonId
      ? { personId: project.ownerPersonId, name: project.ownerName ?? "—" }
      : null;
    const validator = validators[0] ?? null;
    const releaseDate = flows?.details.releaseDate ?? project.dueDate;
    const today = todayInParis();
    const steps = reviewJourney({
      projectId,
      viewerId: access.personId,
      owner,
      validator,
      activationsCount: activations.length,
      releaseDate,
      today,
      reports,
      approvals,
      reserves,
      closures,
    });
    return {
      access,
      project,
      reports,
      approvals,
      reserves,
      closures,
      activations,
      owner,
      validator,
      releaseDate,
      today,
      steps,
      viewer: {
        personId: access.personId,
        name: personName(access.firstName ?? "", access.lastName ?? "") || null,
        isOwner: canEditProject(access, project),
        canValidate: can(access, "validate"),
      },
    };
  }),
);

export type ReviewContext = Awaited<ReturnType<typeof reviewJourneyContext>>;
