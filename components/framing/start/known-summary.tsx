import { FramingLine } from "@/components/framing/framing-line";
import { FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import type { FramingAssessment } from "@/lib/framing/assess";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * « Ce que le projet sait déjà » (proto frEntry): one quiet line — the counts
 * read by code, « Voir le détail » — without a card (Akili, 05/11/2026), the informations grouped under their dimension
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
    <section aria-labelledby="framing-known" className="flex flex-col">
      {/* One quiet line, no card nor pill (Akili, 05/11/2026: « une
          interface sobre d'outil de travail »); the detail under it. */}
      <Fold
        summary={
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-medium">
            <span id="framing-known" className="text-foreground">
              {t.knownTitle}
            </span>
            <span className="tabular-nums">
              {t.known(counts.known, counts.to_confirm, counts.missing)}
            </span>
            <span className="text-foreground underline underline-offset-4">
              {t.detail}
            </span>
          </span>
        }
      >
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
