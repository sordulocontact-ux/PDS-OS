import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { Readiness } from "@/lib/marketing/closure/readiness";

const t = fr.marketingReview.closure;

/** « Avant la clôture »: what blocks the decision, pointed one by one, then
 * what the validator should know (computed by code). */
export function ClosureReadiness({
  readiness,
  reserveText,
  activationTitle,
}: {
  readiness: Readiness;
  reserveText: (id: string) => string;
  activationTitle: (id: string) => string;
}) {
  return (
    <PageSection id="readiness" title={t.readiness.title}>
      {readiness.blockers.length === 0 ? (
        <ToneCallout tone="success">{t.readiness.none}</ToneCallout>
      ) : (
        <div className="grid gap-1.5">
          <h3 className="text-sm font-medium">{t.readiness.blockers}</h3>
          <ul className="grid gap-1.5">
            {readiness.blockers.map((b, i) => (
              <li key={i}>
                <ToneCallout tone="danger">
                  {b.kind === "no_reference_report"
                    ? t.blockerLabels.no_reference_report
                    : t.blockerLabels[b.kind](reserveText(b.reserveId))}
                </ToneCallout>
              </li>
            ))}
          </ul>
        </div>
      )}
      {readiness.warnings.length > 0 && (
        <div className="grid gap-1.5">
          <h3 className="text-sm font-medium">{t.readiness.warnings}</h3>
          <ul className="grid gap-1 text-sm text-muted-foreground">
            {readiness.warnings.map((w, i) => (
              <li key={i}>
                {w.kind === "activation_open"
                  ? t.warningLabels.activation_open(
                      activationTitle(w.activationId),
                    )
                  : t.warningLabels.unpaid(formatEuros(w.cents))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageSection>
  );
}
