import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { countedTitlesProject } from "@/lib/projects/counted-titles";

import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { byProjectVersion } from "@/lib/projects/version-cache";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

import { masterJourney } from "./journey";
import { loadMasterJourneyFacts } from "./journey-facts";

/**
 * What every page of the Master shares, read once per request: access, the
 * project, the facts of the round and the journey for the person looking.
 * Read by whoever sees the project (RLS decides the rows).
 */
export const masterJourneyContext = trackedCache(
  byProjectVersion("master-context", async (projectId: string) => {
    const [access, launched] = await allInOrder([
      requireApproved(),
      requireLaunchedProject(projectId),
    ]);
    // A collective's abandoned titles leave the Master's counts (lot 9).
    const project = countedTitlesProject(launched);
    const facts = await loadMasterJourneyFacts(project);
    // Who pays an invoice, read only when one waits for it.
    const direction =
      facts.invoices.some((i) => i.receivedAt && !i.paidOn) ||
      facts.messages.some((m) => m.status === "escalated")
        ? await loadDirectionPerson()
        : null;
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
        framing?.state === "validated"
          ? (framing.stateChangedAt ?? null)
          : null,
      now: new Date(),
      direction,
    });
    return { access, project, facts, steps, viewerName };
  }),
);

/** The direction (permission `validate`), who pays and arbitrates: the
 * first one (list_direction_people; a member reads only their own
 * membership). */
export const loadDirectionPerson = trackedCache(async () => {
  const access = await requireApproved();
  if (!access.organizationId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_direction_people", {
    p_organization_id: access.organizationId,
  });
  if (error) console.error("loadDirectionPerson:", error.message);
  const first = data?.[0];
  return first
    ? {
        personId: first.person_id,
        name: personName(first.first_name, first.last_name),
      }
    : null;
});
