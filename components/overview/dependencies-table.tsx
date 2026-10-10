import { IconLock } from "nucleo-sharp-essential";

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
import { StatusBadge } from "@/components/ui/status-badge";
import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { dependencyTone } from "@/lib/ui/state-tones";
import type { Dependency } from "@/lib/workflow-status/rules";

/**
 * What one workflow expects from another (ticket « Architecture globale »
 * § 10): the expected object and where it stands, its direction, due date
 * and owner. The row opens the source (§ 11: « naviguer vers la donnée
 * source »). Computed by the code, never entered.
 */
export function DependenciesTable({
  deps,
  legalRestricted = false,
}: {
  deps: Dependency[];
  // The project has a Juridique the viewer may not read: one row says it
  // provides to the others, never what (ticket § 9).
  legalRestricted?: boolean;
}) {
  const t = fr.workflowStatus.dependencies;
  const name = (workflow: Dependency["from"]) =>
    fr.shell.project.sidebar[workflow];
  return (
    <PageSection id="dependencies" title={t.title} description={t.description}>
      {deps.length === 0 && !legalRestricted ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{t.columns.what}</DataTableHead>
            <DataTableHead hideBelow="md">{t.columns.flow}</DataTableHead>
            <DataTableHead>{t.columns.state}</DataTableHead>
            <DataTableHead hideBelow="lg">{t.columns.due}</DataTableHead>
            <DataTableHead hideBelow="lg">{t.columns.who}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {deps.map((dep) => (
              <DataTableRow key={dep.key}>
                <DataTableCell fill>
                  <div className="flex min-w-0 flex-col">
                    <DataTableLink href={dep.href}>{dep.what}</DataTableLink>
                    <span className="text-caption break-words text-muted-foreground">
                      {dep.note}
                    </span>
                  </div>
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  <div className="flex flex-col">
                    <span>
                      {name(dep.from)} → {name(dep.to)}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {t.forStep(dep.toWhat)}
                    </span>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={dependencyTone[dep.state]} size="sm">
                    {t.states[dep.state]}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell hideBelow="lg" className="tabular-nums">
                  {dep.due ? formatShortDate(dep.due) : EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="lg">
                  {dep.who ?? EMPTY_CELL}
                </DataTableCell>
              </DataTableRow>
            ))}
            {legalRestricted && (
              <DataTableRow>
                <DataTableCell fill>
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 font-medium">
                      <IconLock
                        aria-hidden
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                      {t.restricted.what}
                    </span>
                    <span className="text-caption break-words text-muted-foreground">
                      {t.restricted.note}
                    </span>
                  </div>
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  {t.restricted.flow}
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge tone="neutral" size="sm">
                    {t.restricted.state}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell hideBelow="lg">{EMPTY_CELL}</DataTableCell>
                <DataTableCell hideBelow="lg">{EMPTY_CELL}</DataTableCell>
              </DataTableRow>
            )}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
