import { FormMessage } from "@/components/auth/form-message";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { ReceiptsBox } from "@/components/finance/receipts/receipts-box";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { proofsAddress } from "@/lib/finance/proof-address";
import { loadEnvelopeNames, loadProofs } from "@/lib/finance/proof-queries";
import { asProofView, proofRows } from "@/lib/finance/proof-view";
import { loadSpends } from "@/lib/finance/spend-queries";
import type { FinanceSpend } from "@/lib/finance/spends";
import { budget } from "@/lib/i18n/fr/budget";
import { financeReceipts as t } from "@/lib/i18n/fr/finance-receipts";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

/**
 * Finance › Justificatifs (new style lot 6, docs/FINANCE-V2.md; Ibé's
 * ticket: « chaque dépense garde son justificatif »): the tickets and
 * invoices dropped here or sent to po+justificatifs@, read (each value says
 * whether the code found it in the text), and the spend the code proposes
 * for each; a person attaches it, never the AI. The states and proposals
 * are computed here, on every read (lib/finance/proof-view.ts).
 */
export default async function FinanceReceiptsPage({
  searchParams,
}: PageProps<"/app/finance/justificatifs">) {
  const [access, params, proofs, spends, names] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadProofs(),
    loadSpends(),
    loadEnvelopeNames(),
  ]);
  const envelopeOf = (spend: FinanceSpend) =>
    spend.target.kind === "off_budget"
      ? budget.form.offBudget
      : (names.get(spend.target.id) ?? "—");
  const { rows, choices } = proofRows(proofs.proofs, spends.spends, envelopeOf);

  return (
    <FinanceFrame section="receipts">
      {(proofs.error || spends.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      <ReceiptsBox
        rows={rows}
        choices={choices}
        view={asProofView(params.vue)}
        canManage={can(access, "manage_finance")}
        organizationId={access.organizationId}
        address={proofsAddress()}
      />
    </FinanceFrame>
  );
}
