// What a revision of the release's direction touches (MKT-C2-06), shown
// before it is confirmed again: the topics answered since its last
// confirmation, and the deliverables that inherit them — those with no
// answer of their own on one of these topics — with whether their Fiche
// Livrable is already validated. Computed by code. Client-safe.

import type { ConceptionData } from "@/lib/design/conception";
import type { DesignTopic } from "@/lib/design/intentions";
import type { SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";

export type DirectionImpacts = {
  // The changed topics, by their names for the release's direction.
  topics: string[];
  deliverables: Array<{ title: string; sheetValidated: boolean }>;
};

export function directionImpacts(
  data: Pick<ConceptionData, "intentions" | "deliverables">,
  // The ids of the direction's intentions at its last confirmation.
  confirmedIds: string[] | null,
  sheets: Array<{ deliverableId: string; status: SheetStatus }>,
): DirectionImpacts | null {
  if (!confirmedIds) return null;
  const before = new Set(confirmedIds);
  const topics = [
    ...new Set(
      data.intentions
        .filter(
          (i) =>
            i.target === "direction" &&
            i.status === "confirmed" &&
            !before.has(i.id),
        )
        .map((i) => i.topic),
    ),
  ];
  if (topics.length === 0) return null;
  const names: Record<DesignTopic, string> = fr.conception.directionTopics;
  const deliverables = data.deliverables
    .filter((d) => d.status === "confirmed")
    .filter((d) =>
      topics.some(
        (topic) =>
          !data.intentions.some(
            (i) =>
              i.target === "deliverable" &&
              i.deliverableId === d.id &&
              i.status === "confirmed" &&
              i.topic === topic,
          ),
      ),
    )
    .map((d) => {
      const sheet = sheets.find((s) => s.deliverableId === d.id);
      return {
        title: d.title,
        sheetValidated:
          sheet?.status === "ready_for_production" ||
          sheet?.status === "transferred",
      };
    });
  return { topics: topics.map((topic) => names[topic]), deliverables };
}
