import {
  BriefBlock,
  BriefEmpty,
} from "@/components/strategy/brief/brief-block";
import { FactList } from "@/components/ui/fact-list";
import type { FieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

type Family = keyof typeof fr.framing.needs.families;

const text = (field: FieldState | undefined) =>
  field?.value ? (
    <p className="whitespace-pre-wrap">{field.value}</p>
  ) : (
    <BriefEmpty />
  );

/**
 * Dimensions 01 to 04 of the Brief de sortie: positioning, audiences, the
 * narrative (its story parts and angle) and the selected levers by family.
 */
export function BriefSectionsStory({
  data,
  flagged,
}: {
  data: StrategyData;
  // Dimensions with something left to arbitrate.
  flagged: Set<StrategyDimension>;
}) {
  const t = fr.strategyBrief.sections;
  const field = (key: "positioning" | "audiences" | "narrative") =>
    data.fields.find((f) => f.key === key);
  const parts = fr.strategyPilot.narrative.parts;
  const families = fr.framing.needs.families;
  const kept = data.levers.filter(
    (l) => l.state === "selected" && l.review_status === "confirmed",
  );
  const open = data.levers.filter(
    (l) =>
      l.review_status !== "rejected" &&
      (l.state === "to_decide" || l.review_status === "proposed"),
  );

  return (
    <>
      <BriefBlock
        dimension="positioning"
        index={0}
        toDecide={flagged.has("positioning")}
      >
        {text(field("positioning"))}
      </BriefBlock>
      <BriefBlock
        dimension="audiences"
        index={1}
        toDecide={flagged.has("audiences")}
      >
        {text(field("audiences"))}
      </BriefBlock>
      <BriefBlock
        dimension="narrative"
        index={2}
        toDecide={flagged.has("narrative")}
      >
        <FactList
          emptyLabel={t.empty}
          facts={[
            ...data.narrativeParts.map((p) => ({
              label: parts[p.key as keyof typeof parts],
              value: p.value,
            })),
            {
              label: t.narrativeAngle,
              value: field("narrative")?.value ?? null,
            },
          ]}
        />
      </BriefBlock>
      <BriefBlock dimension="levers" index={3} toDecide={flagged.has("levers")}>
        {kept.length === 0 && open.length === 0 ? (
          <BriefEmpty>{t.leversNone}</BriefEmpty>
        ) : (
          <ul className="flex flex-col gap-1">
            {(Object.keys(families) as Family[]).flatMap((family) => {
              const labels = kept
                .filter((l) => l.family === family)
                .map((l) => l.label);
              return labels.length
                ? [
                    <li key={family}>
                      <span className="text-muted-foreground">
                        {families[family]} :{" "}
                      </span>
                      {labels.join(", ")}
                    </li>,
                  ]
                : [];
            })}
            {open.map((l) => (
              <li key={l.id} className="text-[color:var(--tone-warning-fg)]">
                {fr.strategyBrief.toDecide.lever(l.label)}
              </li>
            ))}
          </ul>
        )}
      </BriefBlock>
    </>
  );
}
