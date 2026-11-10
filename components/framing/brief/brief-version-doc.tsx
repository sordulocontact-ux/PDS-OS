import { DocumentSection } from "@/components/ui/document-section";
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
          <DocumentSection
            key={dimension}
            id={`brief-${dimension}`}
            title={t.dimensions[dimension]}
            lines={lines}
            marked={marked}
            aside={
              marking ? (
                <button
                  type="button"
                  aria-pressed={marked}
                  onClick={() => marking.onToggle(dimension)}
                  className={cn(
                    "h-7 rounded-full border border-[color:var(--border-default)] bg-card px-2.5 text-caption transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[color:var(--border-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
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
              )
            }
          />
        );
      })}
    </div>
  );
}
