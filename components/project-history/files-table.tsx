import { IconMicrophone } from "nucleo-sharp-essential";

import { IconArrowDown } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
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
import { routes } from "@/lib/auth/redirects";
import { formatDateTime, formatMegabytes } from "@/lib/calls/format";
import { projectHistory } from "@/lib/i18n/fr/project-history";
import type { ProjectFile } from "@/lib/project-history/queries";

const fr = { projectHistory };

// Call recordings of the project, each downloadable through a short-lived
// signed URL built on the server with the viewer's session.
export function FilesTable({
  projectId,
  files,
}: {
  projectId: string;
  files: ProjectFile[];
}) {
  const t = fr.projectHistory.files;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.call}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.date}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.type}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.size}</DataTableHead>
        <DataTableHead fill align="end">
          {t.columns.action}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {files.map((file) => (
          <DataTableRow key={file.callId}>
            <DataTableCell>
              <DataTableMedia
                visual={<DataTableIcon icon={IconMicrophone} />}
                title={
                  <DataTableLink
                    href={routes.projectCall(projectId, file.callId)}
                  >
                    {file.callTitle}
                  </DataTableLink>
                }
                subtitle={[
                  t.audio,
                  ...(file.hasTranscript ? [t.transcript] : []),
                  ...(file.hasReport ? [t.report] : []),
                ].join(" · ")}
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {formatDateTime(file.occurredAt)}
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              {file.mime ?? EMPTY_CELL}
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {file.bytes
                ? t.megabytes(formatMegabytes(file.bytes))
                : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell fill align="end">
              {file.downloadUrl ? (
                <a
                  href={file.downloadUrl}
                  aria-label={t.downloadLabel(file.callTitle)}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "relative z-10",
                  })}
                >
                  <IconArrowDown aria-hidden />
                  {t.download}
                </a>
              ) : (
                <span className="text-[color:var(--text-tertiary)]">
                  {t.unavailable}
                </span>
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
