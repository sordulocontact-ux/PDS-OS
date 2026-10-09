import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type { UpstreamChain } from "@/lib/strategy/upstream";
import { cn } from "@/lib/utils";

/**
 * Échéances amont (ticket § 5): conception → production → validation →
 * publication for each dated deliverable, computed by code; a past step of a
 * deliverable without an approved version is late.
 */
export function UpstreamChains({ chains }: { chains: UpstreamChain[] }) {
  const t = fr.strategyFlow.calendar;
  return (
    <section aria-labelledby="upstream-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="upstream-title" className="text-body-lg font-semibold">
          {t.upstreamTitle}
        </h3>
        <p className="text-caption text-muted-foreground">{t.upstreamBody}</p>
      </div>
      {chains.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.upstreamEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {chains.map((chain) => (
            <li
              key={chain.deliverableId}
              className="flex flex-col gap-2 rounded-2xl border border-border px-4 py-3"
            >
              <span className="font-semibold break-words">{chain.title}</span>
              <ol className="grid gap-2 sm:grid-cols-4">
                {chain.steps.map((s) => (
                  <li key={s.step} className="flex flex-col gap-0.5">
                    <span className="text-caption text-muted-foreground">
                      {t.steps[s.step]}
                    </span>
                    <span
                      className={cn(
                        "flex flex-wrap items-center gap-2 text-body-md font-medium",
                        s.late && "text-[color:var(--tone-danger-fg)]",
                      )}
                    >
                      {formatDay(s.date)}
                      {s.late && (
                        <StatusBadge tone="danger" size="sm">
                          {t.late}
                        </StatusBadge>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
