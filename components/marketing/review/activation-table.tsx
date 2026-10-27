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
import { marketing } from "@/lib/i18n/fr/marketing";
import type { Activation } from "@/lib/marketing/model";
import { reviewActivationStatusTone } from "@/lib/ui/state-tones";

const fr = { marketing };

const t = fr.marketing.activations;

/**
 * Activations in a read-only list (a dashboard figure's detail, a report's
 * recap): title, type, status, who holds it. `hrefOf` null: plain text.
 */
export function ActivationTable({
  activations,
  hrefOf,
}: {
  activations: Activation[];
  hrefOf: ((id: string) => string) | null;
}) {
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.kind}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.owner}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {activations.map((a) => (
          <DataTableRow key={a.id}>
            <DataTableCell fill>
              {hrefOf ? (
                <DataTableLink href={hrefOf(a.id)}>{a.title}</DataTableLink>
              ) : (
                <span className="break-words">{a.title}</span>
              )}
            </DataTableCell>
            <DataTableCell hideBelow="sm">{t.kinds[a.kind]}</DataTableCell>
            <DataTableCell>
              <StatusBadge
                tone={reviewActivationStatusTone[a.status]}
                size="sm"
              >
                {t.statuses[a.status]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {a.ownerName ?? (
                <span className="text-muted-foreground">
                  {t.fields.noOwner}
                </span>
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
