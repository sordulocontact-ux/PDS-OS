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
import { JoinCallLink } from "@/components/calls/join-call-link";
import { formatSlot, isUpcoming } from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

// Calls of every visible project and the internal meetings: the row opens the
// call, its project (or "Réunion interne") reads under the title; a planned
// call with a video link offers "Rejoindre".
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
                  <DataTableLink href={call.href}>{call.title}</DataTableLink>
                }
                subtitle={call.projectTitle ?? fr.calls.all.internal}
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              <time dateTime={call.occurredAt}>{formatSlot(call)}</time>
            </DataTableCell>
            <DataTableCell fill>
              <div className="flex flex-wrap items-center gap-3">
                <CallStatusBadge
                  status={call.status}
                  upcoming={isUpcoming(call, now)}
                  closed={call.closed}
                />
                {call.meetingUrl && isUpcoming(call, now) && (
                  <JoinCallLink
                    url={call.meetingUrl}
                    title={call.title}
                    size="sm"
                    inRow
                  />
                )}
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
