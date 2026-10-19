import { InvoicePortalForm } from "@/components/legal/invoices/invoice-portal-form";
import type { PortalCardItem } from "@/components/portal/portal-sections";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import { formatFee } from "@/lib/legal/contracts/fields";
import type { ContactInvoice } from "@/lib/legal/invoices/public";
import { formatDay } from "@/lib/utils/day";

const t = fr.legalInvoices;

/**
 * « Votre facture » on the person's page by project (/c/, proto « Projet
 * complet »), one per signed contract with a fee: whom to invoice and the
 * amount expected, then « Envoyer ma facture »; once sent, when PDS pays
 * it; paid, « Merci ».
 */
export function invoicePortalCards({
  token,
  invoices,
}: {
  token: string;
  invoices: ContactInvoice[];
}): PortalCardItem[] {
  return invoices.map((item, index) => {
    const v = item.invoice;
    const expected = t.ht(formatFee(item.amountCents));
    return {
      id: `ps-invoice-${item.needId.slice(0, 8)}`,
      title: t.portal.title,
      state: !v ? "todo" : v.paidOn ? "done" : "waiting",
      action: { label: t.portal.action },
      // After the contract it follows (the journey reversed).
      order: 50 + index,
      workflow: "legal",
      body: !v ? (
        <>
          <p className="text-muted-foreground">{t.portal.intro}</p>
          <FactRows>
            <FactRow label={t.portal.billTo} value={item.billTo} />
            <FactRow
              label={t.portal.expected}
              value={expected}
              source={t.portal.expectedSource}
            />
          </FactRows>
          <InvoicePortalForm
            token={token}
            needId={item.needId}
            expectedCents={item.amountCents}
          />
        </>
      ) : v.paidOn ? (
        <p className="font-medium">
          {t.portal.paid(v.number, formatDay(v.paidOn))}
        </p>
      ) : (
        <p className="font-medium">
          {t.portal.received(
            v.number,
            formatDay(v.receivedOn),
            formatFee(v.amountCents),
            formatDay(v.dueOn),
          )}
        </p>
      ),
    };
  });
}
