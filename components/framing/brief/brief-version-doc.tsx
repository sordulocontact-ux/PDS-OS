import { StatusBadge } from "@/components/ui/status-badge";
import type { BriefSnapshot } from "@/lib/framing/brief-snapshot";
import { DIMENSIONS, type Dimension } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { cn } from "@/lib/utils";

const fr = { framingIntel, framingJourney };

/**
 * A version of the Brief as a document (proto « Suite du Cadrage », Sacha
 * 29/10/2026): one section per dimension, its name, then « libellé |
 * valeur » with the source under the value; « À revoir » on the dimensions
 * the direction sent back. `marking`: the direction asking for a change
 * marks the dimensions here, in the document it reads, not in a second
 * list. Read from the stored snapshot, never recomputed. Server-safe.
 */
export function BriefVersionDoc({
  snapshot,
  reopened = [],
  marking,
}: {
  snapshot: BriefSnapshot;
  reopened?: string[];
  marking?: {
    marked: Dimension[];
    onToggle: (dimension: Dimension) => void;
  };
}) {
  const t = fr.framingIntel;
  const tb = fr.framingJourney.brief;
  return (
    <div className="flex flex-col">
      {DIMENSIONS.map((dimension) => {
        const d = snapshot.dimensions.find((x) => x.dimension === dimension);
        if (!d) return null;
        const marked = marking
          ? marking.marked.includes(dimension)
          : reopened.includes(dimension);
        const lines = [
          ...d.facts.map((f) => ({
            key: f.label,
            label: f.label,
            value: f.value,
            source: null as string | null,
          })),
          ...d.items.map((item) => ({
            key: item.key,
            label: item.label,
            value: item.lines.length
              ? item.lines.join(" · ")
              : (item.value ?? t.notProvided),
            source: item.source ?? null,
          })),
        ];
        return (
          <section
            key={dimension}
            aria-labelledby={`brief-${dimension}`}
            className={cn(
              "flex flex-col gap-2 border-t border-[color:var(--border-hairline)] py-3.5 first:border-t-0 first:pt-1",
              marked &&
                "-mx-2.5 rounded-lg border-t-transparent bg-[var(--tone-warning-bg)] px-2.5",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4
                id={`brief-${dimension}`}
                className="text-body-md font-semibold"
              >
                {t.dimensions[dimension]}
              </h4>
              {marking ? (
                <button
                  type="button"
                  aria-pressed={marked}
                  onClick={() => marking.onToggle(dimension)}
                  className={cn(
                    "h-7 rounded-full border border-[color:var(--border-default)] px-2.5 text-caption transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[color:var(--border-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
                    marked &&
                      "border-transparent bg-[var(--tone-warning-bg)] text-[color:var(--tone-warning-fg)]",
                  )}
                >
                  {marked ? tb.marked : tb.mark}
                </button>
              ) : (
                marked && (
                  <StatusBadge tone="warning" size="sm">
                    {fr.framingJourney.dimensions.states.toReview}
                  </StatusBadge>
                )
              )}
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-body-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              {lines.map((line) => (
                <div key={line.key} className="contents">
                  <dt className="text-[color:var(--text-secondary)]">
                    {line.label}
                  </dt>
                  <dd className="mb-1.5 flex min-w-0 flex-col break-words sm:mb-0">
                    <span className="whitespace-pre-line">{line.value}</span>
                    {line.source && (
                      <span className="text-caption text-[color:var(--text-tertiary)]">
                        {line.source}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
