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

import { masterJourney as masterJourneyText } from "@/lib/i18n/fr/master-journey";

import { liveTransmission, masterJourney } from "./journey";
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
 * Brief, the transmissions, questions and rates stay the project's (one
 * Brief, one engineer per round). The engineers' messages and the invoices
 * are gestures of the whole project: left out of a title's journey, they
 * are said once, by the project's (Travail), not on every title's line and
 * page (audit du 28/11/2026). */
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
    messages: [],
    invoices: [],
  };
}

/**
 * A collective's Master, one title at a time (Maël 23/11/2026, « 1 par
 * son », lot 8): the journey of that title alone, its steps' states read
 * from its own facts (titleFacts), for the spine and the head of its pages.
 */
export const masterTitleJourney = trackedCache(
  async (projectId: string, masterId: string) => {
    const { access, project, facts, steps } =
      await masterJourneyContext(projectId);
    const own = await journeyOf(
      projectId,
      access,
      project,
      titleFacts(facts, masterId),
    );
    const others = othersWithoutSource(facts, masterId);
    const sourced = own.find((s) => s.key === "source")?.status === "done";
    return own.map((step) => {
      // A title added after the Brief: its Mixage waits for its own source
      // (the Brief, shared, is done already).
      if (step.key === "mix" && step.status !== "done" && !sourced)
        return { ...step, status: "blocked" as const, actor: null };
      // One Brief for the project (décision 4): the same step on every
      // title, never open on one and locked on another (audit du 28/11).
      if (step.key === "brief")
        return steps.find((s) => s.key === "brief") ?? step;
      // The package leaves for every title at once: while another title
      // waits for its source, nothing can be sent for this one either.
      if (
        step.key === "mix" &&
        others.length > 0 &&
        step.status !== "done" &&
        !liveTransmission(facts, "mix")
      )
        return {
          ...step,
          status: "blocked" as const,
          actor: null,
          external: [
            ...(step.external ?? []),
            {
              key: "others-source",
              label: masterJourneyText.prereq.othersSource(
                others.map((x) => `« ${x} »`).join(", "),
                others.length > 1,
              ),
              done: false,
            },
          ],
        };
      return step;
    });
  },
);

/** The other titles in the Master's flow still without a confirmed source
 * (none, a mix validated or a master final: past it). */
function othersWithoutSource(
  facts: MasterJourneyFacts,
  masterId: string,
): string[] {
  return facts.titles.flatMap((title) =>
    title.id !== masterId &&
    title.sources.length === 0 &&
    !title.audio.some((a) => a.audioState === "final_master") &&
    !facts.versions.some(
      (v) =>
        v.masterId === title.id &&
        v.stage === "mix" &&
        v.decision === "approved",
    )
      ? [title.title]
      : [],
  );
}

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
