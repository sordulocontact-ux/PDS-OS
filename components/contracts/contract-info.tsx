import Link from "next/link";

import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { routes } from "@/lib/auth/redirects";
import type { ContractDetail } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { formatDate } from "@/lib/release/format";

const fr = { contracts };

const linkClass =
  "underline-offset-4 hover:underline focus-visible:underline outline-none";

/** « Informations » of a contract, on the right: type, owner, project and
 * artist (each opening its page), due date, period, signature, notes. */
export function ContractInfo({ contract }: { contract: ContractDetail }) {
  const t = fr.contracts;
  const p = t.page;
  const period = p.periodValue(
    contract.startsOn && formatDate(contract.startsOn),
    contract.endsOn && formatDate(contract.endsOn),
  );
  return (
    <PageSection card id="contract-info" title={p.facts}>
      <FactList
        emptyLabel={p.none}
        facts={[
          { label: p.type, value: t.types[contract.type] },
          { label: p.owner, value: contract.ownerName || null },
          {
            label: p.project,
            value: contract.projectId && contract.projectTitle && (
              <Link
                href={routes.project(contract.projectId)}
                className={linkClass}
              >
                {contract.projectTitle}
              </Link>
            ),
          },
          {
            label: p.artist,
            value: contract.artistId && contract.artistName && (
              <Link
                href={routes.artist(contract.artistId)}
                className={linkClass}
              >
                {contract.artistName}
              </Link>
            ),
          },
          {
            label: p.dueOn,
            value: contract.dueOn && formatDate(contract.dueOn),
          },
          { label: p.period, value: period || null },
          {
            label: p.signedOn,
            value: contract.signedOn && formatDate(contract.signedOn),
          },
          { label: p.notes, value: contract.notes },
        ]}
      />
    </PageSection>
  );
}
