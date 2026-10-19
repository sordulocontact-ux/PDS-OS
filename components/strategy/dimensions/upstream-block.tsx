import { Rows } from "@/components/ui/rows";
import { fr } from "@/lib/i18n/fr";
import { dayLabel } from "@/lib/strategy/dimension-model";
import type { UpstreamChain } from "@/lib/strategy/upstream";
import { formatDay } from "@/lib/utils/day";

const t = fr.strategyDimensions.upstream;

/**
 * « Échéances amont » under the calendar (proto dimBody « cal »): for each
 * deliverable with a milestone, its first one, then the end of its
 * conception, of its production and its validation, counted back by code
 * (lib/strategy/upstream.ts). They go to the Planning.
 */
export function UpstreamBlock({ chains }: { chains: UpstreamChain[] }) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby="upstream-title">
      <h3 id="upstream-title" className="text-body-md font-semibold">
        {t.title}
      </h3>
      <p className="text-caption text-muted-foreground">{t.note}</p>
      <Rows label={t.title}>
        {chains.length === 0 ? (
          <li className="px-3.5 py-3 text-caption text-muted-foreground">
            {t.none}
          </li>
        ) : (
          chains.map((c) => (
            <li
              key={c.deliverableId}
              className="flex flex-col gap-1 px-3.5 py-3 text-body-sm"
            >
              <b className="font-semibold">{c.deliverableTitle}</b>
              <span className="text-caption text-muted-foreground">
                {t.first(c.milestoneTitle, formatDay(c.milestoneDate))}
              </span>
              {c.steps.map((s) => (
                <span key={s.key} className="text-caption">
                  {t.steps[s.key]} ·{" "}
                  <b className="font-semibold tabular-nums">
                    {formatDay(s.date)}
                  </b>{" "}
                  <span className="text-[color:var(--text-tertiary)]">
                    ({dayLabel(-s.leadDays)})
                  </span>
                  {s.late && <span className="text-error"> · {t.late}</span>}
                </span>
              ))}
            </li>
          ))
        )}
      </Rows>
    </section>
  );
}
