import { IconScale } from "nucleo-sharp-essential";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
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
import { overdueTone } from "@/lib/ui/state-tones";

const fr = { deals };

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
 * due flagged) and who negotiates it.
 */
export function DealsTable({ rows, today }: { rows: Deal[]; today: string }) {
  const t = fr.deals.table;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.deal}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.stage}</DataTableHead>
        <DataTableHead hideBelow="md">{t.next}</DataTableHead>
        <DataTableHead hideBelow="lg" fill>
          {t.assignee}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((deal) => (
          <DataTableRow key={deal.id}>
            <DataTableCell>
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
            <DataTableCell hideBelow="md">
              <NextCell deal={deal} today={today} />
            </DataTableCell>
            <DataTableCell hideBelow="lg" fill>
              {deal.assignee?.name ?? t.unassigned}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
