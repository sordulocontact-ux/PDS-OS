import { IconDisc } from "@/components/icons";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { formatIsrc, type MasterRow } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { masterReleaseTone } from "@/lib/ui/state-tones";

export function MastersTable({ masters }: { masters: MasterRow[] }) {
  const t = fr.catalog.masters;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead>{t.columns.artists}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.isrc}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.release}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.releaseDate}</DataTableHead>
        <DataTableHead fill>{t.columns.status}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {masters.map((master) => (
          <DataTableRow key={master.id}>
            <DataTableCell>
              <DataTableMedia
                visual={<DataTableIcon icon={IconDisc} />}
                title={
                  <DataTableLink href={routes.master(master.id)}>
                    {master.title}
                  </DataTableLink>
                }
                subtitle={master.version}
              />
            </DataTableCell>
            <DataTableCell>{master.artists}</DataTableCell>
            <DataTableCell hideBelow="md">
              {master.isrc ? formatIsrc(master.isrc) : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              {master.release ? (
                <span className="flex items-baseline gap-1.5">
                  {master.release.title}
                  {master.release.otherCount > 0 && (
                    <span className="text-[color:var(--text-tertiary)]">
                      <span aria-hidden>
                        {t.otherReleases.short(master.release.otherCount)}
                      </span>
                      <span className="sr-only">
                        {t.otherReleases.full(master.release.otherCount)}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {master.release?.plannedReleaseDate
                ? formatShortDate(master.release.plannedReleaseDate)
                : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell fill>
              {master.release ? (
                <StatusBadge tone={masterReleaseTone[master.release.status]}>
                  {t.releaseStatus[master.release.status]}
                </StatusBadge>
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
