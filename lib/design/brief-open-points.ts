import type { ConceptionData } from "@/lib/design/conception";
import type { DirectionData } from "@/lib/design/direction";
import { directionSummary } from "@/lib/design/direction-summary";
import type { DesignTopic } from "@/lib/design/intentions";
import { conception } from "@/lib/i18n/fr/conception";
import { conceptionDirection } from "@/lib/i18n/fr/conception-direction";

const fr = { conception, conceptionDirection };

/**
 * The points still open in the Brief créatif, computed by code: what the
 * Stratégie has not confirmed, topics without an answer, intentions not
 * consolidated, needs to qualify, proposals and references waiting, a
 * direction not validated yet.
 */
export function briefOpenPoints(
  data: ConceptionData,
  directionData: DirectionData,
  hasObjective: boolean,
): string[] {
  const t = fr.conceptionDirection.brief.open;
  const directionTitle = fr.conceptionDirection.summary.direction;
  const topicLabel = (topic: DesignTopic) => fr.conception.topics[topic];
  const summary = directionSummary({
    ...data,
    confirmations: directionData.confirmations,
  });
  const proposals = data.intentions.filter(
    (i) => i.status === "proposed",
  ).length;
  const unattached = data.references.filter((r) => r.links.length === 0).length;
  return [
    ...(hasObjective ? [] : [t.noObjective]),
    ...summary.flatMap((s) => {
      const title = s.title ?? directionTitle;
      return s.missing.flatMap((m) =>
        m.kind === "topics"
          ? [t.topics(title, m.topics.map(topicLabel))]
          : m.kind === "not_confirmed"
            ? [t.notConfirmed(title)]
            : m.kind === "to_qualify"
              ? [t.toQualify(title)]
              : [],
      );
    }),
    ...(proposals ? [t.proposals(proposals)] : []),
    ...(unattached ? [t.unattached(unattached)] : []),
    ...(directionData.submissions.some((s) => s.status === "approved")
      ? []
      : [t.directionNotValidated]),
  ];
}
