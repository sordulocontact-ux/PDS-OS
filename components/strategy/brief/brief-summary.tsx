import { sectionCardClass } from "@/components/ui/section-card";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { BriefSnapshot } from "@/lib/strategy/documents/brief-snapshot";
import { briefSummary } from "@/lib/strategy/documents/brief-summary";
import { cn } from "@/lib/utils";

/**
 * « L'essentiel » (MKT-S1-14): one short page — objective, publics, angle,
 * dispositif, key milestones, budget, KPIs, risks — before the detail,
 * with the day it was established; what is open is marked, never hidden.
 */
export function BriefSummary({ snapshot }: { snapshot: BriefSnapshot }) {
  const t = fr.strategyBrief.summary;
  return (
    <section
      aria-labelledby="brief-summary"
      className={cn(sectionCardClass, "flex flex-col gap-4")}
    >
      <div className="flex flex-col gap-1">
        <h2 id="brief-summary" className="text-body-lg font-semibold">
          {t.title}
        </h2>
        <p className="text-caption text-muted-foreground">
          {t.established(formatBriefDate(snapshot.generatedOn))}
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        {briefSummary(snapshot).map((row, i) => (
          <div key={`${row.key}-${i}`} className="contents">
            <dt className="text-sm text-[color:var(--text-secondary)]">
              {row.label}
            </dt>
            <dd
              className={cn(
                "text-sm whitespace-pre-wrap",
                row.warn && "text-[color:var(--tone-warning-fg)]",
                !row.value && "text-[color:var(--text-tertiary)]",
              )}
            >
              {row.value ?? (row.key === "risks" ? t.noRisk : t.none)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
