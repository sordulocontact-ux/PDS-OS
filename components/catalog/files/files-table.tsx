import { FileActions } from "@/components/catalog/files/file-actions";
import {
  FileAdded,
  FileNameMedia,
} from "@/components/catalog/files/file-cells";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
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
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";

const fr = { catalogFiles };

// Files of an artist, a title, a project or a contract, newest first: the
// same cells as the global library (file-cells.tsx): picture or icon, name
// (opens the file in a new tab), precision, format and size, category, date
// and author, then "⋯". A title's audio versions have their own list
// (AudioVersionList).
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
        <DataTableHead hideBelow="md" fill>
          {t.columns.added}
        </DataTableHead>
        <DataTableActionsHead label={t.columns.actions} />
      </DataTableHeader>
      <DataTableBody>
        {files.map((file) => {
          const writable = canEdit && canWriteFile(file, scope);
          return (
            <DataTableRow key={file.id}>
              <DataTableCell>
                <FileNameMedia
                  file={file}
                  previewUrl={file.previewUrl}
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
              <DataTableCell hideBelow="md" fill>
                <FileAdded
                  createdAt={file.createdAt}
                  authorName={file.authorName}
                />
              </DataTableCell>
              <DataTableActionsCell>
                <FileActions
                  owner={owner}
                  file={file}
                  canEdit={writable}
                  canDelete={writable}
                  organizationId={writable ? organizationId : null}
                  categories={scope?.categories}
                  reveal
                />
              </DataTableActionsCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
