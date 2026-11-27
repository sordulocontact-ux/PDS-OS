import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import type { SelectionListItem } from "@/lib/catalog/selections";
import { artistSelections } from "@/lib/i18n/fr/artist-selections";
import { formatShortDay } from "@/lib/utils/day";

const fr = { artistSelections };

const secondary = "text-[color:var(--text-secondary)]";
const sub =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

// Three names under a selection's name, the others counted.
const NAMES_SHOWN = 3;

/**
 * The selections of artists (lot 4 of docs/pds-mic-plan.md): its name and,
 * under it, its first artists; how many; who holds it (« Vous » for the
 * viewer); when it last changed. The row opens the selection.
 */
export function SelectionsTable({
  selections,
  viewerPersonId,
}: {
  selections: SelectionListItem[];
  viewerPersonId: string | null;
}) {
  const t = fr.artistSelections;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead icon="master">{t.columns.name}</DataTableHead>
        <DataTableHead icon="artist" hideBelow="sm">
          {t.columns.artists}
        </DataTableHead>
        <DataTableHead icon="person">{t.columns.holder}</DataTableHead>
        <DataTableHead icon="updated" hideBelow="md" fill>
          {t.columns.updated}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {selections.map((selection) => {
          const names = selection.artistNames;
          return (
            <DataTableRow key={selection.id}>
              {/* Wraps: on a phone the names pushed « Responsable » off the
                  screen. */}
              <DataTableCell className="whitespace-normal">
                <span className="block break-words">
                  <DataTableLink href={routes.artistSelection(selection.id)}>
                    {selection.name}
                  </DataTableLink>
                  {names.length > 0 && (
                    <span className={sub}>
                      {t.artistNames(
                        names.slice(0, NAMES_SHOWN),
                        Math.max(0, names.length - NAMES_SHOWN),
                      )}
                    </span>
                  )}
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="sm" className="tabular-nums">
                {t.artistCount(names.length)}
              </DataTableCell>
              <DataTableCell>
                {selection.holder.personId === viewerPersonId
                  ? t.you
                  : selection.holder.name}
              </DataTableCell>
              <DataTableCell
                hideBelow="md"
                fill
                className={`tabular-nums ${secondary}`}
              >
                {formatShortDay(selection.updatedAt, { bare: true })}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
