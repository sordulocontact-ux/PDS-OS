import { StepSection } from "@/components/shell/journey/step-section";
import { productionPlace } from "@/lib/i18n/fr/production-place";
import type { PlaceDecision } from "@/lib/production/place";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

const fr = { productionPlace };

const t = fr.productionPlace;

/** « Décisions sur le lieu » (proto): each place retained, by whom and
 * why, and when a later decision replaced it — never erased. */
export function PlaceDecisions({ decisions }: { decisions: PlaceDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <StepSection title={t.decisions}>
      <ul className="flex flex-col gap-1.5">
        {decisions.map((d) => (
          <li key={d.id} className="flex gap-2">
            <span
              aria-hidden
              className={
                d.replacedAt
                  ? "text-[color:var(--text-tertiary)]"
                  : "text-[color:var(--tone-success-fg)]"
              }
            >
              {d.replacedAt ? "↺" : "✓"}
            </span>
            <span>
              {t.decision(formatShortInstant(d.at), d.by ?? "—", d.name)}
              {d.reason && ` : « ${d.reason} »`}
              {d.replacedAt && (
                <span className="text-[color:var(--text-tertiary)]">
                  {t.replacedOn(formatShortDay(d.replacedAt))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </StepSection>
  );
}
