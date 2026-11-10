import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
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
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import type { Member } from "@/lib/framing/related";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import type { ClosingBlocker } from "@/lib/production/shoot/blockers";
import {
  isReturnOverdue,
  returnStateOf,
  type ReturnLine,
} from "@/lib/production/shoot/rules";
import type { NetworkOption } from "@/lib/production/sheet";
import { formatShortDate } from "@/lib/release/format";
import {
  equipmentReturnTone,
  overdueTone,
  returnStateTone,
} from "@/lib/ui/state-tones";

import { ClosingCheck } from "./closing-check";
import { EquipmentReturnActions } from "./equipment-return-actions";

const fr = { productionShoot };

const t = fr.productionShoot.equipment;

/** Parcours 12: the confirmed equipment, who brings it back and when, its
 * return state as a whole (computed), and the questions before the
 * administrative closing. */
export function EquipmentReturnSection({
  projectId,
  sheetId,
  equipment,
  closingBlockers,
  today,
  members,
  contacts,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  equipment: ReturnLine[];
  closingBlockers: ClosingBlocker[];
  today: string;
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
}) {
  const state = returnStateOf(equipment);
  return (
    <StepSection
      id="shoot-equipment"
      title={t.title}
      description={t.description}
      aside={
        <StatusBadge tone={returnStateTone[state]}>
          {t.returnState[state]}
        </StatusBadge>
      }
    >
      <div className="flex flex-col gap-6">
        {equipment.length === 0 ? (
          <EmptyNote>{t.empty}</EmptyNote>
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableHead fill>{t.columns.label}</DataTableHead>
              <DataTableHead hideBelow="md">{t.columns.holder}</DataTableHead>
              <DataTableHead hideBelow="sm">{t.columns.due}</DataTableHead>
              <DataTableHead>{t.columns.status}</DataTableHead>
              {canOrganize && (
                <DataTableActionsHead label={t.columns.actions} />
              )}
            </DataTableHeader>
            <DataTableBody>
              {equipment.map((line) => (
                <DataTableRow key={line.id}>
                  <DataTableCell fill>
                    <DataTableMedia
                      title={
                        <span className="break-words">
                          {line.label}
                          {line.quantity !== null &&
                            line.quantity > 1 &&
                            ` ${t.quantity(line.quantity)}`}
                        </span>
                      }
                      subtitle={line.supplier ?? undefined}
                    />
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    {line.holder?.name ?? (
                      <span className="text-muted-foreground">
                        {t.noHolder}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell hideBelow="sm">
                    <div className="flex flex-col items-start gap-1">
                      {line.returnDue ? (
                        formatShortDate(line.returnDue)
                      ) : (
                        <span className="text-muted-foreground">{t.noDue}</span>
                      )}
                      {isReturnOverdue(line, today) && (
                        <StatusBadge size="sm" tone={overdueTone}>
                          {t.overdue}
                        </StatusBadge>
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge
                        size="sm"
                        tone={equipmentReturnTone[line.status]}
                      >
                        {t.statuses[line.status]}
                      </StatusBadge>
                      {line.status === "returned" && line.returnedAt && (
                        <span className="text-xs whitespace-normal text-muted-foreground">
                          {t.returnedBy(
                            line.returnedBy ?? "—",
                            formatDateTime(line.returnedAt),
                          )}
                        </span>
                      )}
                      {line.status === "incident" && line.incidentNote && (
                        <span className="text-xs whitespace-normal text-muted-foreground">
                          {line.returnIssue &&
                            `${fr.productionShoot.equipment.issues[line.returnIssue]} · `}
                          {line.incidentNote}
                        </span>
                      )}
                    </div>
                  </DataTableCell>
                  {canOrganize && (
                    <DataTableActionsCell>
                      <EquipmentReturnActions
                        projectId={projectId}
                        sheetId={sheetId}
                        line={line}
                        members={members}
                        contacts={contacts}
                      />
                    </DataTableActionsCell>
                  )}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
        <ClosingCheck equipment={equipment} blockers={closingBlockers} />
      </div>
    </StepSection>
  );
}
