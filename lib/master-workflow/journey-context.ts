import "server-only";

import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
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
      framing?.state === "validated" ? (framing.stateChangedAt ?? null) : null,
    now: new Date(),
    direction,
  });
  return { access, project, facts, steps, viewerName };
});

/** The general director, who pays (the direction): the first one. */
export const loadDirectionPerson = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select(
      "person_id, person:people!memberships_person_id_fkey(first_name, last_name)",
    )
    .eq("role", "general_director")
    .eq("status", "approved")
    .order("requested_at")
    .limit(1)
    .maybeSingle();
  return data?.person
    ? {
        personId: data.person_id,
        name: personName(data.person.first_name, data.person.last_name),
      }
    : null;
});
