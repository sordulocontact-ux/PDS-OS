import "server-only";

import { nextRoundHourInput } from "@/lib/calls/format";
import {
  designCallPurpose,
  type DesignCallSheetData,
} from "@/lib/design/call-prep";
import type { ConceptionData } from "@/lib/design/conception";
import { missingTopics } from "@/lib/design/intentions";
import { listProjectCreatives } from "@/lib/projects/creatives";
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
  return {
    deliverables: data.deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      missing: missingOf(data, { deliverableId: d.id }),
    })),
    directionMissing: missingOf(data, "direction"),
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
  const creatives = await listProjectCreatives(project.id);
  const people = [
    project.ownerName,
    ...creatives.map((c) => c.name),
    project.artistName,
    ...data.deliverables.map((d) => d.assigneeName),
  ].filter((name): name is string => Boolean(name?.trim()));
  return {
    deliverables,
    directionMissing,
    selected,
    purpose: designCallPurpose({ deliverables }, selected),
    people: [...new Set(people)],
    defaultOccurredAt: nextRoundHourInput(new Date()),
  };
}
