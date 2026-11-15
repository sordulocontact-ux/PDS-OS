import { RecordHistory } from "@/components/finance/record-history";
import { SheetFacts, SheetHead } from "@/components/finance/finance-sheet";
import { Button } from "@/components/ui/button";
import type { RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { spendDay, spendTtc, type FinanceSpend } from "@/lib/finance/spends";
import { budget } from "@/lib/i18n/fr/budget";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { treasury } from "@/lib/i18n/fr/treasury";
import { spendCashTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeSheet.spend;
const amount = (cents: number) => formatAmount(cents, { ht: false });

/** A spend in Finance's side sheet (lot 3): what it is, its amount, its
 * facts, the gestures of its row (« Modifier », « Planifier le
 * remboursement »), then its history. */
export function SpendSheet({
  spend,
  envelope,
  actions,
}: {
  spend: FinanceSpend;
  envelope: string;
  actions: RowAction[];
}) {
  const post = spend.family
    ? spend.family === "other"
      ? spend.familyDetail
      : budget.families[spend.family]
    : null;
  return (
    <>
      <SheetHead
        eyebrow={[budget.form.targetKinds[spend.target.kind], envelope]
          .filter(Boolean)
          .join(" · ")}
        title={spend.label}
        amount={amount(spendTtc(spend))}
        caption={
          <>
            {spend.vatBp !== null && <span>{t.ht(amount(spend.cents))}</span>}
            <StatusBadge tone={spendCashTone[spend.status]} size="sm">
              {treasury.spendStates[spend.status]}
            </StatusBadge>
          </>
        }
      />
      <SheetFacts
        facts={[
          { label: t.envelope, value: envelope },
          { label: t.post, value: post ?? financeSheet.none },
          { label: t.supplier, value: spend.supplier ?? financeSheet.none },
          { label: t.due, value: formatDay(spendDay(spend)) },
          {
            label: t.rebill,
            value: spend.rebillable
              ? spend.rebillIncomeId
                ? t.rebillPlanned
                : t.rebillMissing
              : financeSheet.no,
          },
          {
            label: t.proof,
            value: spend.proof?.name ?? (
              <span className="text-[color:var(--tone-warning-fg)]">
                {t.proofMissing}
              </span>
            ),
          },
          ...(spend.paidByBank ? [{ label: t.status, value: t.bank }] : []),
          ...(spend.note ? [{ label: t.note, value: spend.note }] : []),
        ]}
      />
      {actions.length > 0 && (
        <div
          role="group"
          aria-label={financeSheet.actions}
          className="flex flex-wrap gap-2"
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.key}
                variant="outline"
                size="sm"
                onClick={a.onSelect}
              >
                {Icon && <Icon aria-hidden data-icon="inline-start" />}
                {a.label}
              </Button>
            );
          })}
        </div>
      )}
      <RecordHistory rowId={spend.id} />
    </>
  );
}
