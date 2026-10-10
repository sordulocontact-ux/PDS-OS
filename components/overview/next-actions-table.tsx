"use client";

import { useState } from "react";

import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { DataTableViews } from "@/components/ui/data-table-views";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import type { BoardAction } from "@/lib/workflow-status/board";
import type { WorkflowKey } from "@/lib/workflow-status/rules";

/**
 * The next useful actions of every workflow, late first then by date
 * (lib/workflow-status/board.ts), as the overview's table (maquette 01):
 * what, which workflow, who, when. A view per workflow filters in place;
 * each row opens where the action is done (ticket « Architecture globale »
 * § 11).
 */
export function NextActionsTable({ actions }: { actions: BoardAction[] }) {
  const t = fr.workflowStatus.board.actions;
  const [view, setView] = useState<WorkflowKey | "all">("all");
  const name = (workflow: WorkflowKey) => fr.shell.project.sidebar[workflow];
  const present = [...new Set(actions.map((action) => action.workflow))];
  const shown =
    view === "all"
      ? actions
      : actions.filter((action) => action.workflow === view);

  return (
    <PageSection id="next-actions" title={t.title} description={t.description}>
      <DataTableViews
        label={t.views}
        views={[
          {
            label: t.all,
            count: actions.length,
            current: view === "all",
            onSelect: () => setView("all"),
          },
          ...present.map((workflow) => ({
            label: name(workflow),
            count: actions.filter((action) => action.workflow === workflow)
              .length,
            current: view === workflow,
            onSelect: () => setView(workflow),
          })),
        ]}
      >
        {shown.length === 0 ? (
          <EmptyNote>{t.empty}</EmptyNote>
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableHead fill>{t.columns.what}</DataTableHead>
              <DataTableHead hideBelow="md">{t.columns.workflow}</DataTableHead>
              <DataTableHead hideBelow="lg">{t.columns.who}</DataTableHead>
              <DataTableHead align="end">{t.columns.due}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {shown.map((action) => (
                <DataTableRow key={action.key}>
                  <DataTableCell fill>
                    <div className="flex min-w-0 flex-col">
                      <DataTableLink href={action.href}>
                        {action.title}
                      </DataTableLink>
                      {action.detail && (
                        <span className="text-caption break-words text-muted-foreground">
                          {action.detail}
                        </span>
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    <StatusBadge tone="neutral" size="sm">
                      {name(action.workflow)}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell hideBelow="lg">
                    {action.who ?? EMPTY_CELL}
                  </DataTableCell>
                  <DataTableCell align="end" className="tabular-nums">
                    {action.overdue ? (
                      <StatusBadge tone="warning" size="sm">
                        {t.overdue}
                      </StatusBadge>
                    ) : action.due ? (
                      formatShortDate(action.due)
                    ) : (
                      EMPTY_CELL
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableViews>
    </PageSection>
  );
}
