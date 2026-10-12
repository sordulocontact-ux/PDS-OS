import { FileActions } from "@/components/catalog/files/file-actions";
import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
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
  canWriteFile,
  fileFormat,
  formatFileSize,
  type CatalogFile,
  type FileOwner,
  type FileWriteScope,
} from "@/lib/catalog/file-rules";
import { formatDuration } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

// Files of an artist or a title, newest first: name (opens the file in a new
// tab), precision, format and size, category, author, date, then "⋯". A
// title's audio versions have their own list (AudioVersionList).
export function FilesTable({
  owner,
  files,
  canEdit,
  organizationId = null,
  scope,
}: {
  owner: FileOwner;
  files: CatalogFile[];
  // The library's writer: edit, delete, add a version.
  canEdit: boolean;
  // Where a new version is uploaded (the writer's organization).
  organizationId?: string | null;
  // A writer limited to some categories and her own files.
  scope?: FileWriteScope | null;
}) {
  const t = fr.catalogFiles;
  const labels: Record<string, string> = t.categories[owner.kind];

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.category}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.addedBy}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.columns.addedAt}
        </DataTableHead>
        <DataTableActionsHead label={t.columns.actions} />
      </DataTableHeader>
      <DataTableBody>
        {files.map((file) => {
          const writable = canEdit && canWriteFile(file, scope);
          return (
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
                      {/* The category column is hidden on phones. */}
                      <span className="sm:hidden">
                        {`${labels[file.category] ?? labels.other} · `}
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
                <StatusBadge tone="neutral" size="sm">
                  {labels[file.category] ?? labels.other}
                </StatusBadge>
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
                  canEdit={writable}
                  canDelete={writable}
                  organizationId={writable ? organizationId : null}
                  categories={scope?.categories}
                />
              </DataTableActionsCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
