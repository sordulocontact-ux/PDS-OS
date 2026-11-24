import { FileActions } from "@/components/catalog/files/file-actions";
import {
  FILE_NARROW_COLUMN,
  FileAddedOn,
  FileAuthor,
  FileNameMedia,
} from "@/components/catalog/files/file-cells";
import { FilePreviewList } from "@/components/catalog/files/file-preview-list";
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
import { formatShortDate } from "@/lib/release/format";
import { cn } from "@/lib/utils";

const fr = { catalogFiles };

// Files of an artist, a title, a project or a contract, newest first: the
// same cells as the global library (file-cells.tsx): picture or icon, name
// (opens the file large over the list, FilePreviewList) and its precision,
// then one fact a column (after Accordee, Sacha 24/11/2026): category, type,
// size, who added it, when, then "⋯". A title's audio versions have their own list
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
  const previews = files.map((file) => ({
    ...file,
    context: labels[file.category] ?? labels.other,
  }));

  return (
    <FilePreviewList files={previews}>
      <DataTable>
        <DataTableHeader>
          <DataTableHead fill>{t.columns.name}</DataTableHead>
          <DataTableHead hideBelow="sm">{t.columns.category}</DataTableHead>
          <DataTableHead hideBelow="lg" className={FILE_NARROW_COLUMN}>
            {t.columns.type}
          </DataTableHead>
          <DataTableHead
            hideBelow="xl"
            align="end"
            className={FILE_NARROW_COLUMN}
          >
            {t.columns.size}
          </DataTableHead>
          <DataTableHead hideBelow="xl">{t.columns.addedBy}</DataTableHead>
          <DataTableHead hideBelow="md">{t.columns.addedAt}</DataTableHead>
          <DataTableActionsHead label={t.columns.actions} />
        </DataTableHeader>
        <DataTableBody>
          {files.map((file) => {
            const writable = canEdit && canWriteFile(file, scope);
            const category = labels[file.category] ?? labels.other;
            const format = fileFormat(file.fileName, file.mime);
            const size = formatFileSize(file.bytes);
            return (
              <DataTableRow key={file.id}>
                <DataTableCell fill>
                  <FileNameMedia
                    file={file}
                    previewUrl={file.previewUrl}
                    subtitle={
                      <>
                        {/* On a phone, the hidden columns. */}
                        <span className="sm:hidden">
                          {[
                            category,
                            format,
                            size,
                            formatShortDate(file.createdAt),
                          ].join(" · ")}
                        </span>
                        <span className="hidden sm:inline">
                          {[
                            file.version > 1 && t.versions.badge(file.version),
                            file.description,
                            file.durationSeconds &&
                              formatDuration(file.durationSeconds),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </>
                    }
                  />
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  <StatusBadge tone="neutral" size="sm">
                    {category}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell hideBelow="lg" className={FILE_NARROW_COLUMN}>
                  {format}
                </DataTableCell>
                <DataTableCell
                  hideBelow="xl"
                  align="end"
                  className={cn(FILE_NARROW_COLUMN, "tabular-nums")}
                  sort={file.bytes}
                >
                  {size}
                </DataTableCell>
                <DataTableCell hideBelow="xl">
                  <FileAuthor name={file.authorName} />
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  <FileAddedOn createdAt={file.createdAt} />
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
    </FilePreviewList>
  );
}
