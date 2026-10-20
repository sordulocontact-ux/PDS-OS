import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ViewLink } from "@/components/ui/view-link";
import { todayInParis } from "@/lib/insights/dates";
import { fr } from "@/lib/i18n/fr";
import { invoiceHref } from "@/lib/invoices/href";
import { invoiceState, type ProjectInvoicesView } from "@/lib/invoices/types";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = fr.invoices;

/**
 * « À payer » (proto payList), the direction's list on the project's
 * Budget: each invoice received and not paid, whatever it pays, the
 * soonest due first, with where to pay it (« Ouvrir »: the Master final or
 * the person's step). The transfer is made from PDS's bank; nothing for
 * anyone else, nothing when all is paid.
 */
export function PayList({
  projectId,
  view,
}: {
  projectId: string;
  view: ProjectInvoicesView;
}) {
  if (!view.isDirection) return null;
  const toPay = view.invoices
    .filter((i) => i.receivedAt && !i.paidOn)
    .sort((a, b) => (a.dueOn ?? "").localeCompare(b.dueOn ?? ""));
  if (toPay.length === 0) return null;
  const today = todayInParis();
  return (
    <PageSection
      id="to-pay"
      title={t.payList.title}
      description={t.payList.count(toPay.length)}
      card
    >
      <FactRows>
        {toPay.map((i) => {
          const state = invoiceState(i);
          const late = (i.dueOn ?? "9999") < today;
          return (
            <FactRow
              key={i.id}
              label={t.payList.label(i.number ?? "")}
              value={
                <b className="font-semibold">
                  {t.payList.value(
                    i.contactName,
                    formatAmount(i.amountCents ?? 0),
                  )}
                </b>
              }
              source={t.payList.source(
                formatDay(i.receivedOn!),
                formatDay(i.dueOn!),
                state === "rib",
              )}
              state={
                late
                  ? { tone: "danger", label: t.payList.late }
                  : {
                      tone: state === "rib" ? "danger" : "info",
                      label: t.states[state],
                    }
              }
              side={
                <ViewLink
                  href={invoiceHref(projectId, i)}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  {t.payList.open}
                </ViewLink>
              }
            />
          );
        })}
      </FactRows>
    </PageSection>
  );
}
