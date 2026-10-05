import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { fr } from "@/lib/i18n/fr";
import type { NetworkEngineer } from "@/lib/master-workflow/types";

/** The engineers of the Réseau and what PDS already did with each: a row
 * opens the contact, where its details and notes live. */
export function NetworkEngineersTable({
  engineers,
}: {
  engineers: NetworkEngineer[];
}) {
  const t = fr.masterWorkflow.inventory.network;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.city}</DataTableHead>
        <DataTableHead>{t.columns.history}</DataTableHead>
        <DataTableHead hideBelow="lg" align="end">
          {t.columns.contact}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {engineers.map((engineer) => (
          <DataTableRow key={engineer.id}>
            <DataTableCell fill className="max-w-0">
              <DataTableMedia
                title={
                  <DataTableLink href={engineer.href}>
                    {engineer.name}
                  </DataTableLink>
                }
                subtitle={engineer.structure}
              />
            </DataTableCell>
            <DataTableCell
              hideBelow="md"
              className="text-[color:var(--text-secondary)]"
            >
              {engineer.city ?? EMPTY_CELL}
            </DataTableCell>
            <DataTableCell
              className={
                engineer.history
                  ? undefined
                  : "text-[color:var(--text-secondary)]"
              }
            >
              {engineer.history ?? t.noHistory}
            </DataTableCell>
            <DataTableCell
              hideBelow="lg"
              align="end"
              className="text-[color:var(--text-secondary)]"
            >
              {engineer.email ?? engineer.phone ?? EMPTY_CELL}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
