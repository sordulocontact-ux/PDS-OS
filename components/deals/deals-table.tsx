import { IconScale } from "nucleo-sharp-essential";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { routes } from "@/lib/auth/redirects";
import { followUpDue } from "@/lib/deals/filters";
import { dealName } from "@/lib/deals/names";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { formatShortDate } from "@/lib/release/format";
import { contracts as contractsFr } from "@/lib/i18n/fr/contracts";
import { contractStateTone, overdueTone } from "@/lib/ui/state-tones";

const fr = { deals, contracts: contractsFr };

type Group = { key: string; label: string; rows: Deal[] };

/** What comes next on a deal: a follow-up whose date has come (in red),
 * else the next action and its date, else the follow-up to come. */
function NextCell({ deal, today }: { deal: Deal; today: string }) {
  const t = fr.deals.table;
  if (deal.followUpOn && followUpDue(deal, today))
    return (
      <StatusBadge tone={overdueTone} size="sm">
        {t.followUpDue(formatShortDate(deal.followUpOn))}
      </StatusBadge>
    );
  if (deal.nextAction)
    return (
      <span className="line-clamp-2 whitespace-normal">
        {deal.nextActionOn
          ? t.on(deal.nextAction, formatShortDate(deal.nextActionOn))
          : deal.nextAction}
      </span>
    );
  if (deal.followUpOn)
    return <>{t.followUpOn(formatShortDate(deal.followUpOn))}</>;
  return <>{EMPTY_CELL}</>;
}

/**
 * The deals (BIZ 4), the latest moved first: the row opens the deal; its
 * project or kind under the name; its stage, what comes next (a follow-up
 * due flagged) and who negotiates it. On an artist's page (BIZ 10):
 * `groups` titles them (to follow up, open, signed…) and `contracts` adds
 * each deal's contract and its state.
 */
export function DealsTable({
  rows = [],
  groups,
  contracts,
  today,
}: {
  rows?: Deal[];
  groups?: Group[];
  contracts?: Record<string, { title: string; status: string }>;
  today: string;
}) {
  const t = fr.deals.table;
  const columns = contracts ? 5 : 4;
  // The text columns share the width (Sacha, 12/11/2026: everything sat on
  // the left, the space left unused after « Négocié par »); the stage keeps
  // its 192 px.
  const row = (deal: Deal) => (
    <DataTableRow key={deal.id}>
      <DataTableCell fill>
        <DataTableMedia
          visual={<DataTableIcon icon={IconScale} />}
          title={
            <DataTableLink href={routes.deal(deal.id)}>
              {dealName(deal)}
            </DataTableLink>
          }
          subtitle={
            <>
              {/* The stage column is hidden on phones. */}
              <span className="sm:hidden">
                {fr.deals.stages[deal.stage]} ·{" "}
              </span>
              {deal.titleLabel || deal.titlePosition !== null
                ? deal.projectTitle
                : fr.deals.kinds[deal.kind]}
            </>
          }
        />
      </DataTableCell>
      <DataTableCell hideBelow="sm">
        <DealStageBadge deal={deal} />
      </DataTableCell>
      <DataTableCell hideBelow="md" fill>
        <NextCell deal={deal} today={today} />
      </DataTableCell>
      {contracts && (
        <DataTableCell hideBelow="md" fill>
          <ContractCell contract={contracts[deal.id]} />
        </DataTableCell>
      )}
      <DataTableCell hideBelow="lg" fill>
        {deal.assignee?.name ?? t.unassigned}
      </DataTableCell>
    </DataTableRow>
  );
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.deal}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.stage}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.next}
        </DataTableHead>
        {contracts && (
          <DataTableHead hideBelow="md" fill>
            {t.contract}
          </DataTableHead>
        )}
        <DataTableHead hideBelow="lg" fill>
          {t.assignee}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {groups
          ? groups.flatMap((group) => [
              <DataTableGroupRow key={group.key} columns={columns}>
                {group.label}
              </DataTableGroupRow>,
              ...group.rows.map(row),
            ])
          : rows.map(row)}
      </DataTableBody>
    </DataTable>
  );
}

/** A deal's contract and its state (an artist's page, BIZ 10). */
function ContractCell({
  contract,
}: {
  contract: { title: string; status: string } | undefined;
}) {
  if (!contract) return <>{EMPTY_CELL}</>;
  const states: Record<string, string> = fr.contracts.states;
  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <span className="truncate">{contract.title}</span>
      <StatusBadge
        tone={contractStateTone[contract.status] ?? "neutral"}
        size="sm"
      >
        {states[contract.status] ?? contract.status}
      </StatusBadge>
    </span>
  );
}
