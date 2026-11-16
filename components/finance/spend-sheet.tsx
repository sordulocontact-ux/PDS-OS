import { RecordHistory } from "@/components/finance/record-history";
import { SheetFacts, SheetHead } from "@/components/ui/side-sheet";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  proofExpected,
  sheetDay,
  spendTtc,
  type FinanceSpend,
} from "@/lib/finance/spends";
import { budget } from "@/lib/i18n/fr/budget";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { treasury } from "@/lib/i18n/fr/treasury";
import { spendCashTone } from "@/lib/ui/state-tones";
import { formatAmount } from "@/lib/utils/money";
import { PostLabel } from "@/components/finance/post-label";
import { SpendProof } from "@/components/finance/spend-proof";

const t = financeSheet.spend;
const amount = (cents: number) => formatAmount(cents, { ht: false });

/** A spend in Finance's side sheet (lot 3): what it is, its amount, its
 * facts, the gestures of its row (« Modifier », « Planifier le
 * remboursement »), then its history. */
export function SpendSheet({
  spend,
  envelope,
  actions,
  proofIn,
}: {
  spend: FinanceSpend;
  envelope: string;
  actions: RowAction[];
  // The organization its proof is kept in, when one may give it one (who
  // writes Finance): « Joindre le justificatif » right in the sheet.
  proofIn?: string;
}) {
  const post = spend.family
    ? spend.family === "other"
      ? spend.familyDetail
      : budget.families[spend.family]
    : null;
  return (
    <>
      <SheetHead
        eyebrow={envelope}
        amount={
          spend.vatBp === null
            ? amount(spendTtc(spend))
            : t.ttc(amount(spendTtc(spend)))
        }
        caption={
          <>
            {spend.vatBp !== null && <span>{t.ht(amount(spend.cents))}</span>}
            <StatusBadge tone={spendCashTone[spend.status]}>
              {treasury.spendStates[spend.status]}
            </StatusBadge>
          </>
        }
      />
      <SheetFacts
        facts={[
          {
            label: t.post,
            value: post ? (
              <PostLabel family={spend.family} label={post} />
            ) : (
              financeSheet.none
            ),
          },
          { label: t.supplier, value: spend.supplier ?? financeSheet.none },
          { label: t.date, value: sheetDay(spend.spentOn) },
          ...(spend.dueOn
            ? [{ label: t.due, value: sheetDay(spend.dueOn) }]
            : []),
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
              <span className="flex flex-wrap items-center gap-2">
                {proofExpected(spend) ? (
                  <StatusBadge tone="warning">{t.proofMissing}</StatusBadge>
                ) : (
                  <span className="text-[color:var(--text-secondary)]">
                    {t.proofLater}
                  </span>
                )}
                {proofIn && (
                  <SpendProof spend={spend} organizationId={proofIn} />
                )}
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
                render={a.href ? <Link href={a.href} /> : undefined}
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
