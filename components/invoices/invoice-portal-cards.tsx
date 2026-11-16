import type { PortalCardItem } from "@/components/portal/portal-sections";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { invoices } from "@/lib/i18n/fr/invoices";
import type { PersonInvoices } from "@/lib/invoices/public";
import { formatDay, formatShortInstant } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

import { agreedParts } from "./invoice-card";
import { InvoiceForm } from "./invoice-form";

const fr = { invoices };

const t = fr.invoices.portal;
const h3 =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * « Votre facture » on a person's private link (/m, /c; proto
 * `invoiceCard`, `invPortal`), one card per invoice asked of them on the
 * project, whatever it pays: whom to invoice, the amount agreed, the PDF,
 * its number and amount, the RIB (masked); then « reçue », then « payée ».
 */
export function invoicePortalCards({
  token,
  data,
  project,
  person,
}: {
  // The token of the page the person opened (/m or /c).
  token: string;
  data: PersonInvoices;
  project: string;
  person: string;
}): PortalCardItem[] {
  const several = data.invoices.length > 1;
  return data.invoices.map((i, index) => {
    const master = i.origin === "master";
    const base = {
      id: `ps-invoice-${i.id.slice(0, 8)}`,
      title: several
        ? t.titleOf(master ? t.master : (i.contract ?? ""))
        : t.title,
      // After what it follows (the journey reversed).
      order: (master ? 10 : 50) + index,
      workflow: master ? ("master" as const) : ("legal" as const),
    };
    if (i.state !== "requested" && i.number && i.amountCents !== null)
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
                    formatShortInstant(i.receivedAt!),
                    formatAmount(i.amountCents),
                    formatDay(i.dueOn!),
                  )}
            </ToneCallout>
            {data.ribPending && !i.paidOn && (
              <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                {t.ribPending}
              </p>
            )}
          </div>
        ),
      };
    const parts = master ? agreedParts(i.expected) : "";
    return {
      ...base,
      state: "todo",
      action: { label: t.todo, due: null },
      body: (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            {master ? t.introMaster(project) : t.introContract}
          </p>
          {data.billTo && (
            <section className="flex flex-col gap-2.5 modern:gap-2">
              <h3 className={h3}>{t.billTo}</h3>
              <FactRows>
                <FactRow label={t.legalName} value={data.billTo.legalName} />
                {data.billTo.address && (
                  <FactRow label={t.address} value={data.billTo.address} />
                )}
                {data.billTo.siret && (
                  <FactRow label={t.siret} value={data.billTo.siret} />
                )}
                {data.billTo.vat && (
                  <FactRow label={t.vat} value={data.billTo.vat} />
                )}
              </FactRows>
            </section>
          )}
          {i.expected && (
            <FactRows>
              <FactRow
                label={t.expected}
                value={
                  <span>
                    <b className="font-semibold">
                      {formatAmount(i.expected.total)}
                    </b>
                    {parts && ` (${parts})`}
                  </span>
                }
                source={t.expectedSource[i.origin]}
              />
            </FactRows>
          )}
          <InvoiceForm
            target={{ kind: "link", token, invoiceId: i.id }}
            expectedCents={i.expected?.total ?? null}
            holder={person}
            rib={
              data.rib
                ? {
                    value: `${data.rib.masked} · ${data.rib.holder}`,
                    source: t.ribSource,
                  }
                : null
            }
          />
        </div>
      ),
    };
  });
}
