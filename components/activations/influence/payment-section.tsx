import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ActivationFile } from "@/lib/activations/files/queries";
import type { InfluenceData } from "@/lib/activations/influence/queries";
import type { ActivationScope } from "@/lib/activations/types";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { activations } from "@/lib/i18n/fr/activations";
import { formatDate } from "@/lib/release/format";

import { PaymentButtons } from "./payment-forms";

const fr = { activations, activationInfluence };

const t = fr.activationInfluence.payment;
const tone = {
  not_requested: "neutral",
  document_expected: "warning",
  to_validate: "action",
  ready_to_pay: "info",
  paid_declared: "warning",
  paid_verified: "success",
  dispute: "danger",
} as const;

/** The administrative payment of a collaboration : an obligation and its
 * pieces, « Payé déclaré » ≠ « Payé vérifié » ; budget readers only. */
export function PaymentSection({
  scope,
  targetId,
  payment,
  files,
  canWrite,
  canSeeBudget,
}: {
  scope: ActivationScope;
  targetId: string;
  payment: InfluenceData["payments"][number] | null;
  files: Map<string, ActivationFile>;
  canWrite: boolean;
  canSeeBudget: boolean;
}) {
  if (!canSeeBudget)
    return (
      <ActivationSection id="payment" title={t.title}>
        <EmptyNote>{t.restricted}</EmptyNote>
      </ActivationSection>
    );
  const invoice = payment?.invoice_file_id
    ? files.get(payment.invoice_file_id)
    : undefined;
  const proof = payment?.proof_file_id
    ? files.get(payment.proof_file_id)
    : undefined;
  const money = (n: number, c: string) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: c }).format(
      n,
    );
  return (
    <ActivationSection
      id="payment"
      title={t.title}
      description={t.description}
      action={
        canWrite && (
          <PaymentButtons scope={scope} targetId={targetId} payment={payment} />
        )
      }
    >
      {!payment ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          <StatusBadge tone={tone[payment.status as keyof typeof tone]}>
            {t.statuses[payment.status as keyof typeof t.statuses]}
          </StatusBadge>
          <FactList
            emptyLabel={fr.activations.notProvided}
            facts={[
              {
                label: t.amount,
                value: money(Number(payment.amount), payment.currency),
              },
              { label: t.beneficiary, value: payment.beneficiary },
              { label: t.documents, value: payment.documents_requested },
              {
                label: t.dueOn,
                value: payment.due_on ? formatDate(payment.due_on) : null,
              },
              { label: t.statusNote, value: payment.status_note },
            ]}
          />
          <p className="flex flex-wrap gap-4 text-body-sm">
            {invoice?.href && (
              <a
                href={invoice.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {t.invoiceLink}
              </a>
            )}
            {proof?.href && (
              <a
                href={proof.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {t.proofLink}
              </a>
            )}
          </p>
        </div>
      )}
    </ActivationSection>
  );
}
