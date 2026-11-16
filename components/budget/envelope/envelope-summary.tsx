import { StatCards } from "@/components/ui/stat-cards";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EnvelopeView } from "@/lib/budget/envelope";
import { formatEuros } from "@/lib/budget/types";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { envelopeTone } from "@/lib/ui/state-tones";

const fr = { artistBudget };

/**
 * An artist's envelope in four figures (BUD 2): its amount, what is spent
 * (direct and by its projects), what remains, what no poste was given; an
 * overrun said in words. All computed by code.
 */
export function EnvelopeSummary({
  amountCents,
  view,
}: {
  amountCents: number;
  view: EnvelopeView;
}) {
  const t = fr.artistBudget.tiles;
  return (
    <div className="flex flex-col gap-3">
      <StatCards
        columns={4}
        stats={[
          { label: t.amount, value: formatEuros(amountCents) },
          {
            label: t.spent,
            value: formatEuros(view.spentCents),
            hint: [
              t.spentHint(
                formatEuros(view.directCents),
                formatEuros(view.projectCents),
              ),
              view.pendingCents > 0 &&
                t.pendingHint(formatEuros(view.pendingCents)),
            ]
              .filter(Boolean)
              .join(" · "),
          },
          {
            label: t.rest,
            value: formatEuros(view.restCents),
          },
          {
            label: t.unallocated,
            value: formatEuros(view.unallocatedCents),
            hint: t.unallocatedHint,
          },
        ]}
      />
      {view.over && (
        <StatusBadge tone={envelopeTone.over} className="self-start">
          {t.overrun(formatEuros(-view.restCents))}
        </StatusBadge>
      )}
    </div>
  );
}
