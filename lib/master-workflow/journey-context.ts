import "server-only";

import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

import { masterJourney } from "./journey";
import { loadMasterJourneyFacts } from "./journey-facts";

/**
 * What every page of the Master shares, read once per request: access, the
 * project, the facts of the round and the journey for the person looking.
 * Read by whoever sees the project (RLS decides the rows).
 */
export const masterJourneyContext = cache(async (projectId: string) => {
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const facts = await loadMasterJourneyFacts(project);
  const viewerName =
    personName(access.firstName ?? "", access.lastName ?? "") || null;
  const framing = project.stages.find((s) => s.key === "framing");
  const steps = masterJourney({
    projectId,
    facts,
    viewerId: access.personId,
    owner: project.ownerPersonId
      ? { personId: project.ownerPersonId, name: project.ownerName ?? "—" }
      : null,
    framingValidatedAt:
      framing?.state === "validated" ? (framing.stateChangedAt ?? null) : null,
    now: new Date(),
  });
  return { access, project, facts, steps, viewerName };
});
