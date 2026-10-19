import { FramingLine } from "@/components/framing/framing-line";
import { FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import type { FramingAssessment } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";

/**
 * « Ce que le projet sait déjà » (proto frEntry): the counts read by code,
 * then « Voir le détail », one line per information with its dimension,
 * value or « Pas encore connu », source and state.
 */
export function KnownSummary({
  assessment,
  lines,
}: {
  assessment: FramingAssessment;
  lines: Record<string, string[]>;
}) {
  const t = fr.framingJourney.start;
  const { counts } = assessment;
  return (
    <section
      aria-labelledby="framing-known"
      className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-hairline)] p-4"
    >
      <h3 id="framing-known" className="text-body-md font-semibold">
        {t.knownTitle}
      </h3>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)] tabular-nums">
        {t.known(counts.known, counts.to_confirm, counts.missing)}
      </p>
      <Fold summary={t.detail}>
        <FactRows>
          {assessment.dimensions.flatMap((d) =>
            d.questions.map((q) => (
              <FramingLine
                key={q.key}
                question={q}
                lines={lines[q.key] ?? []}
                eyebrow={fr.framingIntel.dimensions[d.dimension]}
              />
            )),
          )}
        </FactRows>
      </Fold>
    </section>
  );
}
