import { ToneCallout } from "@/components/ui/tone-callout";
import type {
  ConceptionData,
  ConceptionDeliverable,
} from "@/lib/design/conception";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";

type Fact = { label: string; lines: string[] };

const familyLabel = (family: string | null) =>
  family && family in fr.framing.needs.families
    ? fr.framing.needs.families[
        family as keyof typeof fr.framing.needs.families
      ]
    : null;

const constraintLabel = (type: string) =>
  type in fr.framingIntel.constraintTypes
    ? fr.framingIntel.constraintTypes[
        type as keyof typeof fr.framingIntel.constraintTypes
      ]
    : type;

/**
 * What the Stratégie and the Cadrage already say about the target, as
 * facts written by code: role, timing, public, narrative, constraints and
 * dependencies (only for a deliverable). Nothing here is asked.
 */
function factsOf(
  known: ConceptionData["known"],
  deliverable: ConceptionDeliverable | null,
  deliverableCount: number,
): Fact[] {
  const t = fr.conceptionWork.known;
  const release = known.releaseDate
    ? [t.release(formatBriefDate(known.releaseDate))]
    : [];
  const narrative = [
    ...(known.narrative ? [known.narrative] : []),
    ...known.narrativeParts.map(
      (p) => `${fr.strategyPilot.narrative.parts[p.key]} : ${p.value}`,
    ),
  ];
  const shared: Fact[] = [
    { label: t.audiences, lines: known.audiences ? [known.audiences] : [] },
    { label: t.narrative, lines: narrative },
    {
      label: t.constraints,
      lines: known.constraints.map(
        (c) => `${constraintLabel(c.type)} : ${c.text}`,
      ),
    },
  ];
  if (!deliverable)
    return [
      { label: t.role, lines: [t.roleDirection] },
      { label: t.deliverables, lines: [t.deliverableCount(deliverableCount)] },
      { label: t.timing, lines: release },
      ...shared,
    ];

  const origin = fr.conception.origins[deliverable.origin];
  const role = [
    ...(deliverable.leverLabel
      ? [t.lever(deliverable.leverLabel, familyLabel(deliverable.leverFamily))]
      : []),
    deliverable.callTitle
      ? `${origin} · ${fr.conception.originDetails.call(deliverable.callTitle)}`
      : origin,
    ...(deliverable.note ? [deliverable.note] : []),
  ];
  const timing = [
    ...(deliverable.dueDate
      ? [t.due(formatBriefDate(deliverable.dueDate))]
      : []),
    ...(deliverable.milestone
      ? [
          t.milestone(
            deliverable.milestone.title,
            formatBriefDate(deliverable.milestone.date),
          ),
        ]
      : []),
    ...deliverable.upstream
      .filter((s) => s.key === "conception")
      .map((s) => t.upstream.conception(formatBriefDate(s.date))),
    ...release,
  ];
  const dependencies = deliverable.upstream
    .filter((s) => s.key !== "conception")
    .map(
      (s) =>
        `${t.upstream[s.key](formatBriefDate(s.date))}${s.late ? ` (${t.late})` : ""}`,
    );
  return [
    { label: t.role, lines: role },
    { label: t.timing, lines: timing },
    ...shared,
    { label: t.dependencies, lines: dependencies },
  ];
}

export function KnownFacts({
  known,
  deliverable,
  deliverableCount,
}: {
  known: ConceptionData["known"];
  deliverable: ConceptionDeliverable | null;
  deliverableCount: number;
}) {
  const t = fr.conceptionWork.known;
  const facts = factsOf(known, deliverable, deliverableCount);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-body-md font-semibold">
        {deliverable ? t.title : t.titleDirection}
      </h3>
      <dl className="grid gap-x-6 gap-y-4 rounded-2xl border border-border p-4 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-caption text-muted-foreground">{fact.label}</dt>
            {fact.lines.length ? (
              fact.lines.map((line) => (
                <dd key={line} className="break-words">
                  {line}
                </dd>
              ))
            ) : (
              <dd className="text-[color:var(--text-tertiary)]">
                {t.notDefined}
              </dd>
            )}
          </div>
        ))}
      </dl>
      {deliverable?.status === "to_qualify" && (
        <ToneCallout tone="warning">{t.toQualify}</ToneCallout>
      )}
    </section>
  );
}
