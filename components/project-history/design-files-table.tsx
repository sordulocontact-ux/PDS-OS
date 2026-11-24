import { IconLink } from "nucleo-sharp-essential";

import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { IconArrowDown, IconExternalLink } from "@/components/icons";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
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
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime } from "@/lib/calls/format";
import { formatFileSize } from "@/lib/catalog/file-rules";
import type { DesignFile } from "@/lib/design/versions";
import { design } from "@/lib/i18n/fr/design";
import { projectHistory } from "@/lib/i18n/fr/project-history";
import { designStateTone } from "@/lib/ui/state-tones";

const fr = { design, projectHistory };

// Versions deposited in the Conception, newest first; each opens the
// Conception page, where it is reviewed. Files download through a signed URL
// built on the server with the viewer's session.
export function DesignFilesTable({
  projectId,
  files,
}: {
  projectId: string;
  files: DesignFile[];
}) {
  const t = fr.projectHistory.files;
  const v = fr.design.version;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.designColumns.version}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.designColumns.date}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.designColumns.author}</DataTableHead>
        <DataTableHead hideBelow="md">{t.designColumns.state}</DataTableHead>
        <DataTableHead fill align="end">
          {t.columns.action}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {files.map((file) => (
          <DataTableRow key={file.id}>
            <DataTableCell className="max-w-0 min-w-48">
              <DataTableMedia
                visual={
                  file.kind === "file" && file.fileName ? (
                    <FileTypeIcon
                      file={{ fileName: file.fileName, mime: "" }}
                    />
                  ) : (
                    <DataTableIcon icon={IconLink} />
                  )
                }
                title={
                  <DataTableLink href={routes.projectDesign(projectId)}>
                    {`${file.targetTitle ?? t.directionTarget} · ${v.label(file.number)}`}
                  </DataTableLink>
                }
                subtitle={
                  file.kind === "file"
                    ? [
                        file.fileName,
                        file.bytes ? formatFileSize(file.bytes) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : v.link
                }
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {formatDateTime(file.createdAt)}
            </DataTableCell>
            <DataTableCell hideBelow="lg">{file.authorName}</DataTableCell>
            <DataTableCell hideBelow="md">
              <StatusBadge tone={designStateTone[file.status]} size="sm">
                {fr.design.states[file.status]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell fill align="end">
              {file.href ? (
                <a
                  href={file.href}
                  target={file.kind === "link" ? "_blank" : undefined}
                  rel={file.kind === "link" ? "noopener noreferrer" : undefined}
                  aria-label={v.openLabel(file.number)}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "relative z-10",
                  })}
                >
                  <ButtonRoll>
                    {file.kind === "file" ? (
                      <IconArrowDown aria-hidden />
                    ) : (
                      <IconExternalLink aria-hidden />
                    )}
                    {file.kind === "file" ? v.download : v.open}
                  </ButtonRoll>
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
