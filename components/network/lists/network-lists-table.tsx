import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import {
  networkListRoutes,
  type NetworkListItem,
} from "@/lib/network/lists-types";
import { networkListStateTone } from "@/lib/ui/state-tones";

const fr = { networkLists };

const sub =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

// Three names under a list's name, the others counted.
const NAMES_SHOWN = 3;

/**
 * « Mes listes » (Ibé, 18/11/2026): a list's name and, under it, its first
 * people; how many; how many replied; its state; who made it (« Vous » for
 * the viewer). The row opens the list.
 */
export function NetworkListsTable({
  lists,
  viewerPersonId,
}: {
  lists: NetworkListItem[];
  viewerPersonId: string | null;
}) {
  const t = fr.networkLists;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.people}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.replied}</DataTableHead>
        <DataTableHead>{t.columns.state}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.columns.owner}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {lists.map((list) => {
          const names = list.contactNames;
          return (
            <DataTableRow key={list.id}>
              <DataTableCell className="whitespace-normal">
                <span className="block break-words">
                  <DataTableLink href={networkListRoutes.list(list.id)}>
                    {list.name}
                  </DataTableLink>
                  {names.length > 0 && (
                    <span className={sub}>
                      {t.names(
                        names.slice(0, NAMES_SHOWN),
                        Math.max(0, names.length - NAMES_SHOWN),
                      )}
                    </span>
                  )}
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="sm" className="tabular-nums">
                {t.peopleCount(names.length)}
              </DataTableCell>
              <DataTableCell hideBelow="md" className="tabular-nums">
                {t.repliedCount(list.replied, names.length)}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={networkListStateTone[list.state]}>
                  {t.states[list.state]}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell hideBelow="md" fill>
                {list.owner.personId === viewerPersonId
                  ? t.you
                  : list.owner.name}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
