import Link from "next/link";

import {
  ContractTable,
  ContractTableRow,
  rolesOf,
} from "@/components/legal/contracts/contract-table";
import { GenerateDialog } from "@/components/legal/contracts/generate-dialog";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { formatFee } from "@/lib/legal/contracts/fields";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { isAwaitingAgreement } from "@/lib/legal/title-contracts-rules";
import { agreementTone } from "@/lib/ui/state-tones";

const fr = { legalContracts };

const linkClass =
  "underline-offset-4 outline-none hover:underline focus-visible:underline";

/** The approved mapping, in the table of « Contrats à prévoir »: each
 * person, their agreement, where it stands and the next step (generate,
 * open the contract); a justification or an invoice under the line. */
export function AgreementList({
  projectId,
  rows,
}: {
  projectId: string;
  rows: AgreementRow[];
}) {
  const t = fr.legalContracts.agreements;
  return (
    <ContractTable>
      {rows.map((row) => {
        const existing = row.existing && (
          <Link href={routes.contract(row.existing.id)} className={linkClass}>
            {t.existing(row.existing.title)}
          </Link>
        );
        const note = [
          row.noAgreementReason && t.plan.noDealReason(row.noAgreementReason),
          row.financialNeedCents &&
            t.waitingInvoice(formatFee(row.financialNeedCents)),
        ].filter(Boolean);
        return (
          <ContractTableRow
            key={row.key}
            name={row.name}
            roles={rolesOf(row)}
            contract={
              row.template
                ? `${row.template.name} · v${row.template.version}`
                : row.noAgreementReason
                  ? t.plan.noDeal
                  : (existing ?? (row.needId ? t.noCompatible : "—"))
            }
            fee={
              row.proposal.feeCents
                ? formatFee(row.proposal.feeCents, { ht: false })
                : null
            }
            state={
              isAwaitingAgreement(row)
                ? { tone: "warning", label: t.awaiting }
                : { tone: agreementTone[row.state], label: t.states[row.state] }
            }
            note={
              note.length > 0 || (row.template && existing) ? (
                <>
                  {note.join(" · ")}
                  {row.template && existing}
                </>
              ) : undefined
            }
            action={
              row.contract ? (
                <Link
                  href={routes.contract(row.contract.id)}
                  className={buttonVariants({ variant: "outline", size: "xs" })}
                >
                  <ButtonRoll>{t.open}</ButtonRoll>
                </Link>
              ) : isAwaitingAgreement(row) ? undefined : (
                <GenerateDialog projectId={projectId} row={row} />
              )
            }
          />
        );
      })}
    </ContractTable>
  );
}
