import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuros } from "@/lib/budget/types";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { ProductionFile } from "@/lib/production/files/queries";
import {
  isConfirmedEquipment,
  isReturnLate,
} from "@/lib/production/preprod/equipment";
import type { Equipment } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";
import { formatShortDate } from "@/lib/release/format";
import { equipmentStatusTone } from "@/lib/ui/state-tones";

import { EquipmentRowMenu } from "./equipment-actions";

const t = fr.productionPreprod.equipment;

/** The equipment lines: article (category, quantity, the quote it was read
 * from, its verification or return), supplier, price, state. */
export function EquipmentTable({
  projectId,
  sheetId,
  equipment,
  quotes,
  today,
  members,
  contacts,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  equipment: Equipment[];
  quotes: ProductionFile[];
  today: string;
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
}) {
  const fileName = (id: string | null) =>
    id ? quotes.find((q) => q.id === id)?.fileName : undefined;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.item}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.supplier}</DataTableHead>
        <DataTableHead hideBelow="sm" align="end">
          {t.columns.price}
        </DataTableHead>
        <DataTableHead align="end">{t.columns.status}</DataTableHead>
        {canOrganize && <DataTableActionsHead label={t.columns.actions} />}
      </DataTableHeader>
      <DataTableBody>
        {equipment.map((e) => {
          const file = fileName(e.quoteFileId);
          const late = isReturnLate(e, today);
          const subtitle = [
            t.categories[e.category],
            e.quantity ? `× ${e.quantity}` : null,
            file ? t.sourceQuote(file) : null,
            e.verifiedBy && e.verifiedAt
              ? t.verifiedBy(e.verifiedBy, formatShortDate(e.verifiedAt))
              : null,
            isConfirmedEquipment(e) && e.returnDue && e.status !== "returned"
              ? t.returnInfo(formatShortDate(e.returnDue))
              : null,
            e.status === "incident" ? e.incidentNote : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <DataTableRow key={e.id}>
              <DataTableCell fill className="max-w-0">
                <DataTableMedia title={e.label} subtitle={subtitle} />
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {e.supplierName ?? EMPTY_CELL}
              </DataTableCell>
              <DataTableCell
                hideBelow="sm"
                align="end"
                className="tabular-nums"
              >
                {e.priceCents !== null ? formatEuros(e.priceCents) : EMPTY_CELL}
              </DataTableCell>
              <DataTableCell align="end">
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <StatusBadge tone={equipmentStatusTone[e.status]} size="sm">
                    {t.statuses[e.status]}
                  </StatusBadge>
                  {late && (
                    <StatusBadge tone="danger" size="sm">
                      {t.returnLate}
                    </StatusBadge>
                  )}
                </span>
              </DataTableCell>
              {canOrganize && (
                <DataTableActionsCell>
                  <EquipmentRowMenu
                    projectId={projectId}
                    sheetId={sheetId}
                    members={members}
                    contacts={contacts}
                    item={e}
                  />
                </DataTableActionsCell>
              )}
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
