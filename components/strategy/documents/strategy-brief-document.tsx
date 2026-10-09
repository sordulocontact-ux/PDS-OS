import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type { StrategySnapshot } from "@/lib/strategy/brief-snapshot";
import { strategyDimensionTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * A version of the Brief de sortie as it was generated (ticket § 8): the
 * eight dimensions; only what remains to arbitrate is highlighted. The
 * budget section is marked internal.
 */
export function StrategyBriefDocument({
  snapshot,
  eyebrow,
}: {
  snapshot: StrategySnapshot;
  eyebrow: React.ReactNode;
}) {
  const t = fr.strategyFlow;
  const td = fr.strategyDocs.brief;
  const p = snapshot.project;
  return (
    <article className="flex flex-col gap-8 rounded-3xl border border-border bg-background p-5 md:p-8">
      <header className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="text-display-md font-semibold break-words">{p.title}</h2>
        <p className="text-body-md text-muted-foreground">
          {[p.artist, p.type, p.releaseDate ? formatDay(p.releaseDate) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <ToneCallout tone={snapshot.toDecide.length ? "warning" : "success"}>
        <span className="font-semibold">{td.toDecideTitle}</span>
        {snapshot.toDecide.length ? (
          <ul className="mt-1 list-disc pl-5">
            {snapshot.toDecide.map((x) => (
              <li key={`${x.dimension}-${x.label}`}>
                {t.dimensions[x.dimension]} · {x.label}
              </li>
            ))}
          </ul>
        ) : (
          <> · {td.noToDecide}</>
        )}
      </ToneCallout>

      {snapshot.sections.map((section, index) => (
        <section
          key={section.dimension}
          aria-labelledby={`brief-${section.dimension}`}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={`brief-${section.dimension}`}
              className="text-body-lg font-semibold"
            >
              {t.dimensionNumber(index)} {t.dimensions[section.dimension]}
            </h3>
            <StatusBadge tone={strategyDimensionTone[section.state]} size="sm">
              {t.states[section.state]}
            </StatusBadge>
            {section.dimension === "budget" && (
              <StatusBadge tone="neutral" size="sm">
                {td.budgetInternal}
              </StatusBadge>
            )}
          </div>
          <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {section.items.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex flex-col gap-1",
                  item.toDecide &&
                    "rounded-xl bg-[var(--tone-warning-bg)] px-3 py-2",
                )}
              >
                <dt className="text-caption text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="text-body-md font-semibold break-words whitespace-pre-wrap">
                  {item.lines.length ? (
                    <ul className="flex flex-col gap-0.5">
                      {item.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    (item.value ?? (
                      <span className="font-medium text-muted-foreground">
                        {fr.framingIntel.notProvided}
                      </span>
                    ))
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </article>
  );
}
