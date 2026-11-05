import { FramingLine } from "@/components/framing/framing-line";
import { FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import type { FramingAssessment } from "@/lib/framing/assess";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * « Ce que le projet sait déjà » (proto frEntry): the counts read by code,
 * then « Voir le détail », the informations grouped under their dimension
 * (its name said once, Ibé 01/11/2026), each with its value or « Pas encore
 * connu », source and state.
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
      className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)] p-4"
    >
      <h3 id="framing-known" className="text-body-md font-semibold">
        {t.knownTitle}
      </h3>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)] tabular-nums">
        {t.known(counts.known, counts.to_confirm, counts.missing)}
      </p>
      <Fold summary={t.detail}>
        <div className="flex flex-col gap-4">
          {assessment.dimensions
            .filter((d) => d.questions.length > 0)
            .map((d) => (
              <section
                key={d.dimension}
                aria-labelledby={`framing-known-${d.dimension}`}
                className="flex flex-col gap-1.5"
              >
                <h4
                  id={`framing-known-${d.dimension}`}
                  className="text-caption font-semibold text-[color:var(--text-secondary)]"
                >
                  {fr.framingIntel.dimensions[d.dimension]}
                </h4>
                <FactRows>
                  {d.questions.map((q) => (
                    <FramingLine
                      key={q.key}
                      question={q}
                      lines={lines[q.key] ?? []}
                    />
                  ))}
                </FactRows>
              </section>
            ))}
        </div>
      </Fold>
    </section>
  );
}
