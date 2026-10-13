import "server-only";

import { nextRoundHourInput } from "@/lib/calls/format";
import {
  designCallPurpose,
  type DesignCallContext,
  type DesignCallSheetData,
} from "@/lib/design/call-prep";
import type { ConceptionData } from "@/lib/design/conception";
import { missingTopics } from "@/lib/design/intentions";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { createClient } from "@/lib/supabase/server";
import type { ProjectDetail } from "@/lib/projects/types";

/** What each target still lacks, from the confirmed intentions. */
function missingOf(
  data: Pick<ConceptionData, "intentions">,
  target: { deliverableId: string } | "direction",
) {
  return missingTopics(
    data.intentions.filter(
      (i) =>
        i.status === "confirmed" &&
        (target === "direction"
          ? i.target === "direction"
          : i.deliverableId === target.deliverableId),
    ),
  );
}

/** Each deliverable and the direction, with what they still lack. */
export function designCallTargets(
  data: Pick<ConceptionData, "deliverables" | "intentions">,
): Pick<DesignCallSheetData, "deliverables" | "directionMissing"> {
  const direction = new Set(
    data.intentions
      .filter((i) => i.status === "confirmed" && i.target === "direction")
      .map((i) => i.topic),
  );
  return {
    // A topic the release's direction answers is inherited: never asked
    // again about each deliverable (MKT-C2-06).
    deliverables: data.deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      missing: missingOf(data, { deliverableId: d.id }).filter(
        (topic) => !direction.has(topic),
      ),
    })),
    directionMissing: missingOf(data, "direction"),
  };
}

// At most this many open points go on the agenda.
const OPEN_POINTS = 5;

/**
 * The project's open points still open (oldest first) and the version of
 * the artist's identity the release uses — the current one before the
 * start (MKT-C2-05). Read the same way by the panel and the action.
 */
export async function designCallContext(
  projectId: string,
): Promise<DesignCallContext> {
  const supabase = await createClient();
  const [points, workspace, artist] = await Promise.all([
    supabase
      .from("open_points")
      .select("question")
      .eq("project_id", projectId)
      .eq("status", "open")
      .order("created_at")
      .limit(OPEN_POINTS),
    supabase
      .from("design_workspaces")
      .select("identity_version_id")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase.rpc("project_artist_id", { p_project_id: projectId }),
  ]);
  const versionId =
    workspace.data?.identity_version_id ??
    (artist.data
      ? (
          await supabase.rpc("current_artist_identity", {
            p_artist_id: artist.data,
          })
        ).data
      : null);
  const { data: version } = versionId
    ? await supabase
        .from("artist_identity_versions")
        .select("number")
        .eq("id", versionId)
        .maybeSingle()
    : { data: null };
  return {
    openPoints: (points.data ?? []).map((p) => p.question),
    identityVersion: version?.number ?? null,
  };
}

/** What « Préparer un échange créatif » opens with. */
export async function designSheetData(
  project: Pick<ProjectDetail, "id" | "ownerName" | "artistName">,
  data: Pick<ConceptionData, "deliverables" | "intentions">,
): Promise<DesignCallSheetData> {
  const { deliverables, directionMissing } = designCallTargets(data);
  const selected = deliverables
    .filter((d) => d.missing.length > 0 || d.status === "to_qualify")
    .map((d) => d.id);
  const [creatives, context] = await Promise.all([
    listProjectCreatives(project.id),
    designCallContext(project.id),
  ]);
  const people = [
    project.ownerName,
    ...creatives.map((c) => c.name),
    project.artistName,
    ...data.deliverables.map((d) => d.assigneeName),
  ].filter((name): name is string => Boolean(name?.trim()));
  return {
    deliverables,
    directionMissing,
    context,
    selected,
    purpose: designCallPurpose({ deliverables }, selected),
    people: [...new Set(people)],
    defaultOccurredAt: nextRoundHourInput(new Date()),
  };
}
