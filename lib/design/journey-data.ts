import "server-only";

import type { Access } from "@/lib/auth/access";
import { buildCreativeBrief } from "@/lib/design/brief";
import { loadCreativeBriefs, sameBrief } from "@/lib/design/brief-store";
import type { ConceptionData } from "@/lib/design/conception";
import { loadDirection } from "@/lib/design/direction";
import { directionSummary, hasContent } from "@/lib/design/direction-summary";
import type { JourneyInput } from "@/lib/design/journey";
import { loadDesignPeople } from "@/lib/design/people";
import type { SheetSummary } from "@/lib/design/sheet-summaries";
import { directionState } from "@/lib/design/states";
import { createClient } from "@/lib/supabase/server";

/**
 * The facts the Conception's journey is computed from (MKT-C2-03), read with
 * the user's session (RLS): the creative exchanges prepared, the direction's
 * responsible, validators and latest version, the Fiches Livrables, and
 * whether the latest Brief créatif still matches what the code would build
 * now. Nothing here decides a state: lib/design/journey.ts does.
 */
export async function loadJourneyInput(
  project: { id: string; title: string; artistName: string },
  access: Access,
  data: ConceptionData,
  sheets: SheetSummary[],
): Promise<JourneyInput> {
  const projectId = project.id;
  const supabase = await createClient();
  const [callsRes, people, briefs] = await Promise.all([
    supabase
      .from("design_calls")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    data.started
      ? loadDesignPeople(projectId, data.organizationId, access)
      : null,
    data.started ? loadCreativeBriefs(projectId) : [],
  ]);
  const direction = people
    ? await loadDirection(projectId, people.members)
    : null;
  const latestBrief = briefs[0] ?? null;
  const live =
    latestBrief && direction
      ? await buildCreativeBrief(project, data, direction)
      : null;

  const scope = people?.direction;
  const sections = direction
    ? directionSummary({ ...data, confirmations: direction.confirmations })
    : [];
  const inProgress = data.stage?.state === "in_progress";
  const confirmed = data.deliverables.filter((d) => d.status === "confirmed");

  return {
    projectId,
    started: data.started,
    isOwner: data.isOwner,
    canWrite: data.canWrite,
    callsPlanned: callsRes.count ?? 0,
    callSources: data.sources.filter((s) => s.kind === "call").length,
    proposals: data.intentions.filter((i) => i.status === "proposed").length,
    unattachedReferences: data.references.filter((r) => r.links.length === 0)
      .length,
    toQualify: data.deliverables.filter((d) => d.status === "to_qualify")
      .length,
    direction: {
      state: directionState({
        hasResponsible: Boolean(scope?.responsible),
        hasValidators: Boolean(scope?.validators.length),
        hasContent: sections.some(hasContent),
        latest: direction?.submissions[0] ?? null,
      }),
      answered: data.intentions.filter(
        (i) => i.target === "direction" && i.status === "confirmed",
      ).length,
      proposals: data.intentions.filter(
        (i) => i.target === "direction" && i.status === "proposed",
      ).length,
      hasResponsible: Boolean(scope?.responsible),
      canSubmit:
        inProgress &&
        (data.isOwner || scope?.responsible?.personId === access.personId),
    },
    deliverables: confirmed.map((d) => {
      const sheet = sheets.find((s) => s.deliverableId === d.id);
      return {
        id: d.id,
        title: d.title,
        answered: d.answered,
        proposals: d.proposals,
        sheet: sheet ? { id: sheet.id, status: sheet.status } : null,
      };
    }),
    brief: {
      latest: latestBrief?.number ?? null,
      upToDate: Boolean(
        latestBrief && live && sameBrief(latestBrief.content, live),
      ),
    },
    stageState: data.stage?.state ?? "not_started",
  };
}
