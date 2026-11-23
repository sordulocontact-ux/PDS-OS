import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { countedTitlesProject } from "@/lib/projects/counted-titles";

import type { Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName, type ProjectDetail } from "@/lib/projects/types";
import { byProjectVersion } from "@/lib/projects/version-cache";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

import { masterJourney } from "./journey";
import {
  loadMasterJourneyFacts,
  type MasterJourneyFacts,
} from "./journey-facts";

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
    const viewerName =
      personName(access.firstName ?? "", access.lastName ?? "") || null;
    const steps = await journeyOf(projectId, access, project, facts);
    return { access, project, facts, steps, viewerName };
  }),
);

/** The journey for the person looking, from the facts given. */
async function journeyOf(
  projectId: string,
  access: Access,
  project: ProjectDetail,
  facts: MasterJourneyFacts,
) {
  // Who pays an invoice, read only when one waits for it.
  const direction =
    facts.invoices.some((i) => i.receivedAt && !i.paidOn) ||
    facts.messages.some((m) => m.status === "escalated")
      ? await loadDirectionPerson()
      : null;
  const framing = project.stages.find((s) => s.key === "framing");
  return masterJourney({
    projectId,
    facts,
    viewerId: access.personId,
    owner: project.ownerPersonId
      ? { personId: project.ownerPersonId, name: project.ownerName ?? "—" }
      : null,
    framingValidatedAt:
      framing?.state === "validated" ? (framing.stateChangedAt ?? null) : null,
    now: new Date(),
    direction,
  });
}

/** A collective's facts for one title (its master): its audio and
 * sources, its versions, what was received for it, its file requests. The
 * Brief, the transmissions, the engineers' messages, questions, rates and
 * invoices stay the project's (one Brief, one engineer per round). */
export function titleFacts(
  facts: MasterJourneyFacts,
  masterId: string,
): MasterJourneyFacts {
  return {
    ...facts,
    titles: facts.titles.filter((t) => t.id === masterId),
    versions: facts.versions.filter((v) => v.masterId === masterId),
    received: facts.received.filter((r) => r.masterId === masterId),
    fileRequests: facts.fileRequests.filter((r) => r.masterId === masterId),
    fileRequestLog: facts.fileRequestLog.filter((r) => r.masterId === masterId),
  };
}

/**
 * A collective's Master, one title at a time (Maël 23/11/2026, « 1 par
 * son », lot 8): the journey of that title alone, its steps' states read
 * from its own facts (titleFacts), for the spine and the head of its pages.
 */
export const masterTitleJourney = trackedCache(
  async (projectId: string, masterId: string) => {
    const { access, project, facts } = await masterJourneyContext(projectId);
    return journeyOf(projectId, access, project, titleFacts(facts, masterId));
  },
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
