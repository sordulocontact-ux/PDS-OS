import { ProvenanceNote } from "@/components/framing/provenance-note";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { projectWork } from "@/lib/i18n/fr/project-work";
import type { ExternalMember } from "@/lib/project-work/team";

const fr = { projectWork };

const t = fr.projectWork.team;

// People without an account, named during a call: who, role, and source.
export function ExternalTeamTable({
  projectId,
  members,
}: {
  projectId: string;
  members: ExternalMember[];
}) {
  if (members.length === 0)
    return <p className="text-sm text-muted-foreground">{t.externalEmpty}</p>;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.externalColumns.name}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.externalColumns.role}</DataTableHead>
        <DataTableHead fill hideBelow="md">
          {t.externalColumns.source}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {members.map((m) => (
          <DataTableRow key={m.id}>
            <DataTableCell className="truncate">{m.name}</DataTableCell>
            <DataTableCell hideBelow="sm">{m.role || t.noRole}</DataTableCell>
            <DataTableCell fill hideBelow="md" className="whitespace-normal">
              <ProvenanceNote provenance={m.provenance} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
