import { RecordHistory } from "@/components/finance/record-history";
import { SheetFacts, SheetHead } from "@/components/finance/finance-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { spendDay, spendTtc, type FinanceSpend } from "@/lib/finance/spends";
import { budget } from "@/lib/i18n/fr/budget";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { treasury } from "@/lib/i18n/fr/treasury";
import { spendCashTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { IconPaperclip } from "nucleo-sharp-essential";
import { PostLabel } from "@/components/finance/post-label";
import { ViewLink } from "@/components/ui/view-link";

const t = financeSheet.spend;
const amount = (cents: number) => formatAmount(cents, { ht: false });

/** A spend in Finance's side sheet (lot 3): what it is, its amount, its
 * facts, the gestures of its row (« Modifier », « Planifier le
 * remboursement »), then its history. */
export function SpendSheet({
  spend,
  envelope,
  actions,
  attachProof,
}: {
  spend: FinanceSpend;
  envelope: string;
  actions: RowAction[];
  // How to give it its proof when it has none: its form (a Finance spend),
  // else Finance › Justificatifs, where the dropped file is matched to it.
  attachProof?: { onSelect: () => void } | { href: string };
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
        amount={amount(spendTtc(spend))}
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
          { label: t.envelope, value: envelope },
          {
            label: t.post,
            value: post ? (
              <PostLabel family={spend.family} label={post} />
            ) : (
              financeSheet.none
            ),
          },
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
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="warning">{t.proofMissing}</StatusBadge>
                {attachProof &&
                  ("href" in attachProof ? (
                    <ViewLink
                      href={attachProof.href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      <IconPaperclip aria-hidden data-icon="inline-start" />
                      {t.attachProof}
                    </ViewLink>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={attachProof.onSelect}
                    >
                      <IconPaperclip aria-hidden data-icon="inline-start" />
                      {t.attachProof}
                    </Button>
                  ))}
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
