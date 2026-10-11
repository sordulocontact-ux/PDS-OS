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
import type { ActivationSummary } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

import {
  ActivationStatusBadge,
  MeasureBadge,
  ProofBadge,
} from "./activation-badges";

const t = fr.activations;

/** The activations of a project: type, mode and owner under the title, the
 * three axes side by side, the due date, the next action and what blocks.
 * The whole row opens the activation. */
export function ActivationsTable({
  projectId,
  rows,
  members,
}: {
  projectId: string;
  rows: ActivationSummary[];
  members: Member[];
}) {
  const nameOf = (id: string | null) =>
    id
      ? (members.find((m) => m.personId === id)?.name ?? EMPTY_CELL)
      : t.noOwner;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.activation}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.proof}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.measure}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.due}</DataTableHead>
        <DataTableHead fill hideBelow="lg">
          {t.columns.next}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((a) => {
          const subtitle = [
            t.kinds[a.kind],
            a.mode ? t.modes[a.mode] : null,
            nameOf(a.ownerPersonId),
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <DataTableRow key={a.id}>
              <DataTableCell>
                <DataTableMedia
                  title={
                    <DataTableLink
                      href={routes.projectActivation(projectId, a.id)}
                    >
                      {a.title}
                    </DataTableLink>
                  }
                  subtitle={subtitle}
                />
              </DataTableCell>
              <DataTableCell>
                <ActivationStatusBadge status={a.status} />
              </DataTableCell>
              <DataTableCell hideBelow="sm">
                <ProofBadge state={a.proof} />
              </DataTableCell>
              <DataTableCell hideBelow="md">
                <MeasureBadge state={a.measure} />
              </DataTableCell>
              <DataTableCell hideBelow="lg" className="tabular-nums">
                {a.dueOn ? formatShortDate(a.dueOn) : EMPTY_CELL}
              </DataTableCell>
              <DataTableCell fill hideBelow="lg">
                <div className="flex min-w-0 flex-col">
                  <span className="break-words">
                    {a.next?.label ?? EMPTY_CELL}
                  </span>
                  {a.blocked && (
                    <span className="text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
                      {t.columns.blocker} · {t.views.blocked}
                    </span>
                  )}
                </div>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
