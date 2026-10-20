import { InvoicePanel } from "@/components/invoices/invoice-panel";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import type { ProjectInvoicesView } from "@/lib/invoices/types";
import type { MasterBudgetLine } from "@/lib/master-workflow/budget-lines";
import { budgetStatusTone } from "@/lib/ui/state-tones";
import { formatDay, formatShortInstant } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = fr.invoices.team;
const tb = fr.masterInvoice.budget;
const h3 =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * « Facture et paiement » (« À payer » for the direction) at the bottom of
 * the Master final (proto `payBlock`): each external engineer's invoice
 * through the one invoice panel of the app, then the Budget of the Master.
 * The payment never blocks the release.
 */
export function InvoiceBlock({
  projectId,
  view,
  budget,
  inHouse = false,
}: {
  projectId: string;
  view: ProjectInvoicesView;
  budget: MasterBudgetLine[];
  // The engineer is a member of PDS: no invoice (proto `payBlock`).
  inHouse?: boolean;
}) {
  const invoices = view.invoices.filter((i) => i.origin === "master");
  if (invoices.length === 0)
    return inHouse ? (
      <section className="flex flex-col gap-3">
        <h3 className={h3}>{t.title}</h3>
        <FactRows>
          <FactRow
            label={t.inHouse}
            value={t.inHouseValue}
            source={t.inHouseSource}
          />
        </FactRows>
      </section>
    ) : null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className={h3}>
        {view.isDirection && invoices.some((i) => i.receivedAt && !i.paidOn)
          ? t.titleDirection
          : t.title}
      </h3>
      {invoices.map((i) => (
        <InvoicePanel
          key={i.id}
          projectId={projectId}
          invoice={i}
          view={view}
        />
      ))}
      {budget.length > 0 && (
        <>
          <h3 className={h3}>{tb.title}</h3>
          <FactRows>
            {budget.map((line) => {
              const inv = invoices.find(
                (i) => i.receivedAt && i.expected?.[line.stage] != null,
              );
              const source =
                line.status === "paid" && inv?.paidOn
                  ? [tb.paid(formatDay(inv.paidOn)), inv.paidBy]
                      .filter(Boolean)
                      .join(" · ")
                  : line.status === "invoiced" && inv?.receivedAt
                    ? tb.invoiced(
                        inv.number ?? "",
                        formatShortInstant(inv.receivedAt),
                        formatDay(inv.dueOn!),
                      )
                    : line.status === "committed"
                      ? [line.note, tb.committed].filter(Boolean).join(" · ")
                      : line.note;
              return (
                <FactRow
                  key={line.stage}
                  label={line.label}
                  value={formatAmount(line.amountCents)}
                  source={source}
                  state={{
                    tone: budgetStatusTone[line.status] ?? "neutral",
                    label:
                      fr.budget.statuses[
                        line.status as keyof typeof fr.budget.statuses
                      ] ?? line.status,
                  }}
                />
              );
            })}
          </FactRows>
        </>
      )}
    </section>
  );
}
