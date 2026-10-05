import { FileActions } from "@/components/catalog/files/file-actions";
import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { AudioStateBadge } from "@/components/catalog/title/audio-state-badge";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fileFormat,
  formatFileSize,
  type CatalogFile,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { formatDuration } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

// Files of an artist or a title, newest first: name (opens the file in a new
// tab), precision, format and size, category, author, date, then "⋯".
// `audio`: the audio versions of a title (Audio tab), so their audio state
// instead of the category, the duration beside the size, and no editing
// (their state is set on upload).
export function FilesTable({
  owner,
  files,
  canEdit,
  organizationId = null,
  audio = false,
}: {
  owner: FileOwner;
  files: CatalogFile[];
  // The library's writer: edit, delete, add a version.
  canEdit: boolean;
  // Where a new version is uploaded (the writer's organization).
  organizationId?: string | null;
  audio?: boolean;
}) {
  const t = fr.catalogFiles;
  const labels: Record<string, string> = t.categories[owner.kind];

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="sm">
          {audio ? t.columns.audioState : t.columns.category}
        </DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.addedBy}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.columns.addedAt}
        </DataTableHead>
        <DataTableActionsHead label={t.columns.actions} />
      </DataTableHeader>
      <DataTableBody>
        {files.map((file) => (
          <DataTableRow key={file.id}>
            <DataTableCell>
              <DataTableMedia
                visual={<FileTypeIcon file={file} />}
                title={
                  <DataTableLink href={file.openUrl} newTab>
                    <span className="sr-only">{t.open(file.fileName)}</span>
                    <span aria-hidden>{file.fileName}</span>
                  </DataTableLink>
                }
                subtitle={
                  <>
                    {/* The category (state) column is hidden on phones. */}
                    <span className="sm:hidden">
                      {audio
                        ? file.audioState &&
                          `${fr.catalog.audioStates[file.audioState]} · `
                        : `${labels[file.category] ?? labels.other} · `}
                    </span>
                    {[
                      file.version > 1 && t.versions.badge(file.version),
                      file.description,
                      fileFormat(file.fileName, file.mime),
                      formatFileSize(file.bytes),
                      file.durationSeconds &&
                        formatDuration(file.durationSeconds),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </>
                }
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {audio ? (
                file.audioState ? (
                  <AudioStateBadge state={file.audioState} size="sm" />
                ) : (
                  EMPTY_CELL
                )
              ) : (
                <StatusBadge tone="neutral" size="sm">
                  {labels[file.category] ?? labels.other}
                </StatusBadge>
              )}
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              {file.authorName || EMPTY_CELL}
            </DataTableCell>
            <DataTableCell hideBelow="md" fill>
              {formatShortDate(file.createdAt)}
            </DataTableCell>
            <DataTableActionsCell>
              <FileActions
                owner={owner}
                file={file}
                canEdit={canEdit && !audio}
                canDelete={canEdit}
                organizationId={audio ? null : organizationId}
              />
            </DataTableActionsCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
