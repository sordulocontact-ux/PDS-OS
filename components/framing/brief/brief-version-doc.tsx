import { FactRow, FactRows } from "@/components/ui/fact-row";
import type { BriefSnapshot } from "@/lib/framing/brief-snapshot";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * A version of the Brief as the proto reads it (frBriefDoc): one line per
 * dimension, « 01 · Objectif », then « **Libellé** : valeur · source »,
 * and « À revoir » on the dimensions the direction sent back. Read from the
 * stored snapshot, never recomputed. The full document (synthesis, PDF) is
 * BriefDocument.
 */
export function BriefVersionDoc({
  snapshot,
  reopened = [],
}: {
  snapshot: BriefSnapshot;
  reopened?: string[];
}) {
  const t = fr.framingIntel;
  return (
    <FactRows>
      {DIMENSIONS.map((dimension, index) => {
        const d = snapshot.dimensions.find((x) => x.dimension === dimension);
        if (!d) return null;
        return (
          <FactRow
            key={dimension}
            value={
              <span className="flex flex-col gap-0.5">
                <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold tracking-wide text-[color:var(--text-tertiary)] uppercase">
                  {t.dimensionNumber(index)} · {t.dimensions[dimension]}
                </span>
                {[
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
                ].map((line) => (
                  <span key={line.key} className="break-words">
                    <span className="font-semibold">{line.label}</span> :{" "}
                    {line.value}
                    {line.source && (
                      <span className="text-caption text-[color:var(--text-secondary)]">
                        {" "}
                        · {line.source}
                      </span>
                    )}
                  </span>
                ))}
              </span>
            }
            state={
              reopened.includes(dimension)
                ? {
                    tone: "warning",
                    label: fr.framingJourney.dimensions.states.toReview,
                  }
                : null
            }
          />
        );
      })}
    </FactRows>
  );
}
