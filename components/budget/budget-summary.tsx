import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuros, type BudgetTotals } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

// Envelope and totals, all computed by code from the lines. An overrun is
// said in words; the danger tone only reinforces it.
export function BudgetSummary({
  envelopeCents,
  totals,
}: {
  envelopeCents: number | null;
  totals: BudgetTotals;
}) {
  const t = fr.budget;
  const remaining = totals.remainingCents;
  return (
    <div className="flex flex-col gap-3">
      <StatTiles
        columns={5}
        stats={[
          {
            label: t.tiles.envelope,
            value:
              envelopeCents === null
                ? t.noEnvelope
                : formatEuros(envelopeCents),
          },
          { label: t.tiles.planned, value: formatEuros(totals.plannedCents) },
          {
            label: t.tiles.committed,
            value: formatEuros(totals.committedCents),
          },
          { label: t.tiles.paid, value: formatEuros(totals.paidCents) },
          {
            label: t.tiles.remaining,
            value: remaining === null ? "—" : formatEuros(remaining),
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        {remaining !== null && remaining < 0 && (
          <StatusBadge tone="danger">
            {t.overrun(formatEuros(-remaining))}
          </StatusBadge>
        )}
        <p className="text-caption text-muted-foreground">{t.envelopeHint}</p>
      </div>
    </div>
  );
}
