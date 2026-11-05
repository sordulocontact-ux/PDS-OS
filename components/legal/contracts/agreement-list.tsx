import Link from "next/link";

import { GenerateDialog } from "@/components/legal/contracts/generate-dialog";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { formatFee } from "@/lib/legal/contracts/fields";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { agreementTone } from "@/lib/ui/state-tones";

const fr = { legalContracts, masterPage };

const linkClass =
  "underline-offset-4 outline-none hover:underline focus-visible:underline";

/** The approved mapping: each person, their agreement, where it stands and
 * the next step (generate, open the contract). */
export function AgreementList({
  projectId,
  rows,
}: {
  projectId: string;
  rows: AgreementRow[];
}) {
  const t = fr.legalContracts.agreements;
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium break-words">{row.name}</span>
            <span className="text-sm text-muted-foreground">
              {[
                row.creditRoles
                  .map((role) => fr.masterPage.credits.roles[role])
                  .join(" · "),
                row.template
                  ? `${row.template.name} · v${row.template.version}`
                  : row.needId && t.noCompatible,
                row.proposal.feeCents && formatFee(row.proposal.feeCents),
              ]
                .filter(Boolean)
                .join(" — ")}
            </span>
            {row.noAgreementReason && (
              <span className="text-sm break-words text-muted-foreground">
                {t.plan.noDealReason(row.noAgreementReason)}
              </span>
            )}
            {row.existing && (
              <Link
                href={routes.contract(row.existing.id)}
                className={`text-sm ${linkClass}`}
              >
                {t.existing(row.existing.title)}
              </Link>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <StatusBadge tone={agreementTone[row.state]}>
              {t.states[row.state]}
            </StatusBadge>
            {row.financialNeedCents && (
              <span className="text-sm text-muted-foreground">
                {t.waitingInvoice(formatFee(row.financialNeedCents))}
              </span>
            )}
            {row.contract ? (
              <Link
                href={routes.contract(row.contract.id)}
                className={buttonVariants({ variant: "outline", size: "xs" })}
              >
                <ButtonRoll>{t.open}</ButtonRoll>
              </Link>
            ) : (
              <GenerateDialog projectId={projectId} row={row} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
