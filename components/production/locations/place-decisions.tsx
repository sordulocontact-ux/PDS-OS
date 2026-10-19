import { fr } from "@/lib/i18n/fr";
import type { PlaceDecision } from "@/lib/production/place";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.productionPlace;

/** « Décisions sur le lieu » (proto): each place retained, by whom and
 * why, and when a later decision replaced it — never erased. */
export function PlaceDecisions({ decisions }: { decisions: PlaceDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{t.decisions}</h3>
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
    </section>
  );
}
