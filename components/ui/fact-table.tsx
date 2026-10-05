import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Fact } from "@/lib/facts/types";
import { fr } from "@/lib/i18n/fr";
import { factTone } from "@/lib/ui/state-tones";

/** Facts of one section of a workflow's first step (État des lieux, État
 * du master): a row opens its source, its state stays visible, and the last
 * column holds what can be done (add to Réseau, split, add a file…), drawn
 * by the caller's `renderAction`. Facts of a title carry it as a tag in the
 * Titre column (one hue per title), never mixed into the detail. */
export function FactTable<Action>({
  facts,
  renderAction,
}: {
  facts: Array<Fact<Action>>;
  renderAction: (action: Action) => React.ReactNode;
}) {
  const t = fr.facts.columns;
  const byTitle = facts.some((fact) => fact.group);
  const withActions = facts.some((fact) => fact.action);
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.fact}</DataTableHead>
        {byTitle && <DataTableHead>{t.title}</DataTableHead>}
        <DataTableHead hideBelow="md">{t.source}</DataTableHead>
        <DataTableHead align={withActions ? "start" : "end"}>
          {t.state}
        </DataTableHead>
        {withActions && (
          // As narrow as its buttons.
          <DataTableHead align="end" className="w-px">
            <span className="sr-only">{t.actions}</span>
          </DataTableHead>
        )}
      </DataTableHeader>
      <DataTableBody>
        {facts.map((fact) => (
          <DataTableRow key={fact.key}>
            <DataTableCell fill className="max-w-0">
              <DataTableMedia
                title={
                  <DataTableLink href={fact.href}>{fact.label}</DataTableLink>
                }
                subtitle={fact.detail}
              />
            </DataTableCell>
            {byTitle && (
              <DataTableCell className="max-w-48">
                {fact.group && (
                  <StatusBadge
                    tone={fact.group.hue}
                    // The artists, for a title that exists in several versions.
                    title={fact.group.artists || undefined}
                    className="max-w-full truncate"
                  >
                    {fact.group.title}
                  </StatusBadge>
                )}
              </DataTableCell>
            )}
            <DataTableCell
              hideBelow="md"
              className="text-[color:var(--text-secondary)]"
            >
              {fact.source}
            </DataTableCell>
            <DataTableCell align={withActions ? "start" : "end"}>
              <StatusBadge tone={factTone[fact.status]}>
                {fact.statusLabel}
              </StatusBadge>
            </DataTableCell>
            {withActions && (
              <DataTableCell align="end" className="w-px whitespace-nowrap">
                {fact.action && renderAction(fact.action)}
              </DataTableCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
