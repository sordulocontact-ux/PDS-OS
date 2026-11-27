import { CallStatusBadge } from "@/components/calls/call-badges";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/calls/format";
import { productionCall } from "@/lib/i18n/fr/production-call";
import type { ProductionCallSummary } from "@/lib/production/call-queries";

const fr = { productionCall };

/** The production calls of one sheet: title (to the call's page), date, state. */
export function ProductionCallList({
  calls,
}: {
  calls: ProductionCallSummary[];
}) {
  const t = fr.productionCall.columns;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead icon="call" fill>
          {t.call}
        </DataTableHead>
        <DataTableHead icon="date" hideBelow="sm">
          {t.date}
        </DataTableHead>
        <DataTableHead icon="status" align="end">
          {t.state}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {calls.map((call) => (
          <DataTableRow key={call.callId}>
            <DataTableCell fill className="max-w-0">
              <DataTableLink href={call.href}>{call.title}</DataTableLink>
            </DataTableCell>
            <DataTableCell
              hideBelow="sm"
              className="text-[color:var(--text-secondary)] tabular-nums"
            >
              <time dateTime={call.occurredAt}>
                {formatDateTime(call.occurredAt)}
              </time>
            </DataTableCell>
            <DataTableCell align="end">
              <CallStatusBadge status={call.status} upcoming={call.upcoming} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
