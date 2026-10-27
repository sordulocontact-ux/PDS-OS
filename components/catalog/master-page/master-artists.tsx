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
import { routes } from "@/lib/auth/redirects";
import type { Credit } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { catalog, masterPage };

// Performing artists of the master, listed like every table (no number: the
// order carries no meaning here), each a link to its page, the role in a tag.
export function MasterArtists({ credits }: { credits: Credit[] }) {
  const t = fr.masterPage.artistsTable;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.artist}</DataTableHead>
        <DataTableHead fill>{t.role}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {credits.map((credit) => (
          <DataTableRow key={credit.artistId}>
            <DataTableCell>
              <DataTableLink href={routes.artist(credit.artistId)}>
                {credit.name}
              </DataTableLink>
            </DataTableCell>
            <DataTableCell fill>
              <StatusBadge tone="neutral" size="sm">
                {fr.catalog.artistPicker.roles[credit.role]}
              </StatusBadge>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
