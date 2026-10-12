import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuros, type BudgetTotals } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

// Envelope, then the forecast, the committed and the real spend, each with
// its own remainder (MKT-S1-12), all computed by code from the lines. An
// overrun is said in words; the danger tone only reinforces it.
export function BudgetSummary({
  envelopeCents,
  totals,
}: {
  envelopeCents: number | null;
  totals: BudgetTotals;
}) {
  const t = fr.budget;
  const rest = (cents: number | null) =>
    cents === null
      ? undefined
      : cents < 0
        ? t.tiles.overrunOf(formatEuros(-cents))
        : t.tiles.restOf(formatEuros(cents));
  const remaining = totals.remaining.committed;
  return (
    <div className="flex flex-col gap-3">
      <StatTiles
        columns={4}
        stats={[
          {
            label: t.tiles.envelope,
            value:
              envelopeCents === null
                ? t.noEnvelope
                : formatEuros(envelopeCents),
            hint: t.envelopeHint,
          },
          {
            label: t.tiles.forecast,
            value: formatEuros(totals.forecastCents),
            hint: [rest(totals.remaining.forecast), t.tiles.hints.forecast]
              .filter(Boolean)
              .join(" · "),
          },
          {
            label: t.tiles.committed,
            value: formatEuros(totals.committedCents),
            hint: [rest(totals.remaining.committed), t.tiles.hints.committed]
              .filter(Boolean)
              .join(" · "),
          },
          {
            label: t.tiles.real,
            value: formatEuros(totals.realCents),
            hint: [rest(totals.remaining.real), t.tiles.hints.real]
              .filter(Boolean)
              .join(" · "),
          },
        ]}
      />
      {remaining !== null && remaining < 0 && (
        <StatusBadge tone="danger" className="self-start">
          {t.overrun(formatEuros(-remaining))}
        </StatusBadge>
      )}
    </div>
  );
}
