import type { PortalCardItem } from "@/components/portal/portal-sections";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { PublicInvoice } from "@/lib/master-workflow/invoice-public";
import { eurosHt, invoiceDueOn } from "@/lib/master-workflow/invoice-rules";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

import { InvoiceForm } from "./invoice-form";

const t = fr.masterInvoice.link;
const h3 =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

const parts = (e: NonNullable<PublicInvoice["expected"]>) =>
  [
    e.mix !== null ? `mix ${eurosHt(e.mix).replace(" HT", "")}` : null,
    e.mastering !== null
      ? `mastering ${eurosHt(e.mastering).replace(" HT", "")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** « Votre facture » on the engineer's link (proto `invoiceCard`): whom to
 * invoice, the amount committed, the PDF, its number and amount, the RIB
 * (masked); then « reçue », then « payée ». */
export function invoicePortalCard({
  linkKey,
  invoice: i,
  project,
  engineer,
}: {
  linkKey: string;
  invoice: PublicInvoice;
  project: string;
  engineer: string;
}): PortalCardItem {
  const base = {
    id: "ps-invoice",
    title: t.title,
    order: 10,
    workflow: "master" as const,
  };
  if (i.receivedAt && i.number && i.amountCents !== null)
    return {
      ...base,
      state: i.paidOn ? "done" : "waiting",
      body: (
        <div className="flex flex-col gap-3">
          <ToneCallout tone={i.paidOn ? "success" : "info"}>
            {i.paidOn
              ? t.paid(i.number, formatDay(i.paidOn))
              : t.received(
                  i.number,
                  formatShortInstant(i.receivedAt),
                  eurosHt(i.amountCents),
                  formatDay(invoiceDueOn(i.receivedAt)),
                )}
          </ToneCallout>
          {i.ribPending && !i.paidOn && (
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.ribPending}
            </p>
          )}
        </div>
      ),
    };
  return {
    ...base,
    state: "todo",
    action: { label: t.todo, due: null },
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">{t.intro(project)}</p>
        {i.billTo && (
          <section className="flex flex-col gap-2.5">
            <h3 className={h3}>{t.billTo}</h3>
            <FactRows>
              <FactRow label={t.legalName} value={i.billTo.legalName} />
              <FactRow label={t.address} value={i.billTo.address} />
              {i.billTo.siret && (
                <FactRow label={t.siret} value={i.billTo.siret} />
              )}
              {i.billTo.vat && <FactRow label={t.vat} value={i.billTo.vat} />}
            </FactRows>
          </section>
        )}
        {i.expected && (
          <FactRows>
            <FactRow
              label={t.expected}
              value={
                <span>
                  <b className="font-semibold">{eurosHt(i.expected.total)}</b> (
                  {parts(i.expected)})
                </span>
              }
              source={t.expectedSource}
            />
          </FactRows>
        )}
        <InvoiceForm
          target={{ kind: "link", linkKey }}
          expectedCents={i.expected?.total ?? null}
          holder={engineer}
          rib={
            i.rib
              ? {
                  value: `${i.rib.masked} · ${i.rib.holder}`,
                  source: t.ribSource,
                }
              : null
          }
        />
      </div>
    ),
  };
}
