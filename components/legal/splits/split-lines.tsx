import { NewSplitLinkButton } from "@/components/legal/splits/split-actions";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { SplitLine } from "@/lib/legal/splits/queries";
import { formatShare, totalUnits } from "@/lib/legal/splits/shares";
import { splitConfirmationTone } from "@/lib/ui/state-tones";
import { formatInstant } from "@/lib/utils/instant";

/** The lines of a version (or of the title's page, not sent yet): who,
 * which role, which share (rounded for reading), and each person's answer;
 * « Nouveau lien » while the version is open. */
export function SplitLines({
  projectId,
  title,
  lines,
  open,
}: {
  projectId: string;
  title: string;
  lines: SplitLine[];
  open: boolean;
}) {
  const t = fr.legalSplits.page;
  return (
    <div className="flex flex-col gap-2">
      <DataTable>
        <DataTableHeader>
          <DataTableHead>{t.columns.person}</DataTableHead>
          <DataTableHead hideBelow="sm">{t.columns.role}</DataTableHead>
          <DataTableHead hideBelow="md" fill>
            {t.columns.state}
          </DataTableHead>
          <DataTableHead align="end">{t.columns.share}</DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {lines.map((line) => (
            <DataTableRow key={line.id ?? line.name}>
              <DataTableCell>
                <span className="font-medium break-words whitespace-normal">
                  {line.name}
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="sm">
                {fr.legalSplits.roles[line.role]}
              </DataTableCell>
              <DataTableCell hideBelow="md" fill>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={splitConfirmationTone[line.confirmation.state]}
                    size="sm"
                  >
                    {fr.legalSplits.confirmationStates[line.confirmation.state]}
                  </StatusBadge>
                  {line.confirmation.at && (
                    <span className="text-sm text-muted-foreground">
                      {t.answeredOn(formatInstant(line.confirmation.at))}
                    </span>
                  )}
                  {/* A waiting link has its own card (SplitLinks). */}
                  {open &&
                    line.id &&
                    !line.confirmation.link &&
                    line.confirmation.state !== "confirmed" && (
                      <NewSplitLinkButton
                        projectId={projectId}
                        entryId={line.id}
                        name={line.name}
                        title={title}
                      />
                    )}
                </span>
              </DataTableCell>
              <DataTableCell align="end">
                {formatShare(line.units)}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      <p className="self-end text-sm font-medium tabular-nums">
        {t.total(formatShare(totalUnits(lines.map((l) => l.units))))}
      </p>
    </div>
  );
}
