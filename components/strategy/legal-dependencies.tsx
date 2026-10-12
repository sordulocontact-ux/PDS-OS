import { ToneCallout } from "@/components/ui/tone-callout";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { LegalDependency, OpenNeed } from "@/lib/strategy/queries";

/**
 * Prerequisites the Dispositif depends on (MKT-S1-07), read from the
 * Juridique and the Cadrage, never typed again nor classed as levers: each
 * open legal action with its responsible and date, then the Cadrage's
 * legal needs not yet in the Juridique's plan.
 */
export function LegalDependencies({
  dependencies,
  needs,
}: {
  dependencies: LegalDependency[];
  needs: OpenNeed[];
}) {
  const t = fr.strategyDispositif.legal;
  if (dependencies.length === 0 && needs.length === 0) return null;
  return (
    <section
      aria-labelledby="legal-dependencies"
      className="flex flex-col gap-2"
    >
      <h3 id="legal-dependencies" className="text-body-md font-semibold">
        {t.title}
      </h3>
      <p className="text-caption text-muted-foreground">{t.description}</p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {dependencies.map((d) => (
          <li key={d.id} className="flex flex-wrap gap-x-2">
            <span className="font-medium">{d.label}</span>
            <span className="text-[color:var(--text-secondary)]">
              {[
                t.statuses[d.status as keyof typeof t.statuses] ?? d.status,
                d.responsibleName && t.responsible(d.responsibleName),
                d.dueOn && t.due(formatBriefDate(d.dueOn)),
                t.source,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      {needs.length > 0 && (
        <ToneCallout tone="info">
          {t.needs(needs.map((n) => n.label).join(", "))}
        </ToneCallout>
      )}
    </section>
  );
}
