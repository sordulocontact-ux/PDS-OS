import { IconPhone } from "nucleo-sharp-essential";

import { CallStatusBadge } from "@/components/calls/call-badges";
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
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime, isUpcoming } from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";

// Calls of every visible project: the row opens the call, its project reads
// under the title.
export function AllCallsTable({
  calls,
  now,
}: {
  calls: CallListItem[];
  // Reference time for "À venir", taken once by the page.
  now: Date;
}) {
  const t = fr.calls.all.columns;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.title}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.date}</DataTableHead>
        <DataTableHead fill>{t.status}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {calls.map((call) => (
          <DataTableRow key={call.id}>
            <DataTableCell>
              <DataTableMedia
                visual={<DataTableIcon icon={IconPhone} />}
                title={
                  <DataTableLink
                    href={routes.projectCall(call.projectId, call.id)}
                  >
                    {call.title}
                  </DataTableLink>
                }
                subtitle={call.projectTitle}
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              <time dateTime={call.occurredAt}>
                {formatDateTime(call.occurredAt)}
              </time>
            </DataTableCell>
            <DataTableCell fill>
              <CallStatusBadge
                status={call.status}
                upcoming={isUpcoming(call, now)}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
