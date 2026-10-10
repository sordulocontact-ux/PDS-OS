"use client";

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
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import {
  dependencyOptions,
  type ActionState,
} from "@/lib/production/preprod/plan";
import type { PlanAction } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";
import { formatShortDate } from "@/lib/release/format";
import { planStateTone } from "@/lib/ui/state-tones";

import { PlanRowMenu } from "./plan-row-menu";

const t = fr.productionPreprod.plan;

/** The plan's actions: a box to select a draft, the action (what it waits
 * for, « Bloquant »), the pressenti, the date, its state, its « ⋯ ». */
export function PlanTable({
  projectId,
  sheetId,
  actions,
  all,
  states,
  members,
  contacts,
  canOrganize,
  selected,
  onSelect,
}: {
  projectId: string;
  sheetId: string;
  actions: PlanAction[];
  all: PlanAction[];
  states: Record<string, ActionState>;
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
  selected: Set<string>;
  onSelect: (id: string, on: boolean) => void;
}) {
  const titleOf = (id: string) => all.find((a) => a.id === id)?.title;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.action}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.holder}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.due}</DataTableHead>
        <DataTableHead align="end">{t.columns.state}</DataTableHead>
        {canOrganize && <DataTableActionsHead label={t.columns.actions} />}
      </DataTableHeader>
      <DataTableBody>
        {actions.map((action) => {
          const state = states[action.id] ?? "draft";
          const waits = action.dependsOn
            .map(titleOf)
            .filter((x): x is string => Boolean(x));
          return (
            <DataTableRow key={action.id}>
              <DataTableCell fill className="max-w-0">
                <div className="flex items-start gap-3">
                  {canOrganize && action.status === "draft" && (
                    <Checkbox
                      className="mt-1"
                      aria-label={t.select(action.title)}
                      checked={selected.has(action.id)}
                      onChange={(e) => onSelect(action.id, e.target.checked)}
                    />
                  )}
                  <DataTableMedia
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="break-words">{action.title}</span>
                        {action.blocking && (
                          <StatusBadge tone="danger" size="sm">
                            {t.blocking}
                          </StatusBadge>
                        )}
                      </span>
                    }
                    subtitle={
                      [
                        waits.length ? t.waitsFor(waits.join(", ")) : null,
                        action.note,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  />
                </div>
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {action.holder?.name ?? t.noHolder}
              </DataTableCell>
              <DataTableCell hideBelow="sm" className="tabular-nums">
                {action.dueDate ? formatShortDate(action.dueDate) : EMPTY_CELL}
              </DataTableCell>
              <DataTableCell align="end">
                <StatusBadge tone={planStateTone[state]} size="sm">
                  {t.actionStates[state]}
                </StatusBadge>
              </DataTableCell>
              {canOrganize && (
                <DataTableActionsCell>
                  <PlanRowMenu
                    projectId={projectId}
                    sheetId={sheetId}
                    action={action}
                    dependencies={dependencyOptions(all, action.id)}
                    members={members}
                    contacts={contacts}
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
