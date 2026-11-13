import { CardRow, ListCard } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { budget } from "@/lib/i18n/fr/budget";
import { finance } from "@/lib/i18n/fr/finance";
import type { FinanceLine } from "@/lib/finance/types";
import { overdueTone } from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, finance };

/** Whether an invoice is past the day it was to be paid by. */
export const isLate = (line: FinanceLine, today: string) =>
  line.dueOn !== null && line.dueOn < today;

/**
 * A card of single spends of the Finance page: « À payer » (who sent it, the
 * day it is due, « En retard » past it) or « Plus grosses dépenses » (the
 * poste and the day). Each names its project or artist; the row opens its
 * Budget when the reader may read it there (`hrefOf`).
 */
export function FinanceLinesCard({
  kind,
  lines,
  today,
  targetOf,
  hrefOf,
}: {
  kind: "toPay" | "largest";
  lines: FinanceLine[];
  today: string;
  // « EP Nova », « Kalia »: the line's project or artist.
  targetOf: (line: FinanceLine) => string | null;
  hrefOf: (line: FinanceLine) => string | null;
}) {
  const t = fr.finance[kind];
  return (
    <ListCard
      title={t.title}
      count={kind === "toPay" ? lines.length : undefined}
      empty={lines.length === 0 ? t.empty : undefined}
    >
      {lines.map((line) => {
        const late = kind === "toPay" && isLate(line, today);
        const when =
          kind === "toPay"
            ? line.dueOn
              ? fr.finance.toPay.due(formatShortDay(line.dueOn, { bare: true }))
              : fr.finance.toPay.noDue
            : formatShortDay(line.spentOn, { bare: true });
        return (
          <CardRow
            key={line.id}
            href={hrefOf(line)}
            main={line.label}
            sub={[
              targetOf(line),
              kind === "toPay"
                ? line.contactName
                : line.family && fr.budget.families[line.family],
              when,
            ]
              .filter(Boolean)
              .join(" · ")}
            badge={
              <span className="flex flex-col items-end gap-1">
                <span className="text-body-md font-semibold tabular-nums">
                  {formatAmount(line.cents, { ht: false })}
                </span>
                {late && (
                  <StatusBadge tone={overdueTone} size="sm">
                    {fr.finance.toPay.late}
                  </StatusBadge>
                )}
              </span>
            }
          />
        );
      })}
    </ListCard>
  );
}
