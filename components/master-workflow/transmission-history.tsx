import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import {
  transmissionState,
  type TransmissionRow,
} from "@/lib/master-workflow/transmission-types";
import { transmissionStateTone } from "@/lib/ui/state-tones";

/** Each sending, newest first, with its state computed by code (received,
 * waiting, to remind, expired, replaced by a reminder). */
export function TransmissionHistory({ rows }: { rows: TransmissionRow[] }) {
  const t = fr.masterWorkflow.mix.history;
  const now = new Date();
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.sentAt}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.to}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.by}</DataTableHead>
        <DataTableHead align="end">{t.columns.state}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => {
          const state = transmissionState(row, now);
          return (
            <DataTableRow key={row.id}>
              <DataTableCell fill className="max-w-0">
                <DataTableMedia
                  title={formatDateTime(row.sentAt)}
                  subtitle={row.note}
                />
              </DataTableCell>
              <DataTableCell hideBelow="sm">{row.engineer}</DataTableCell>
              <DataTableCell
                hideBelow="md"
                className="text-[color:var(--text-secondary)]"
              >
                {row.sentBy}
              </DataTableCell>
              <DataTableCell align="end">
                <StatusBadge tone={transmissionStateTone[state]}>
                  {state === "received" && row.acknowledgedAt
                    ? t.states.received(formatDateTime(row.acknowledgedAt))
                    : state === "received"
                      ? t.states.waiting
                      : t.states[state]}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
