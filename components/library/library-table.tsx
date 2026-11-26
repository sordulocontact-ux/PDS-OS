"use client";

import Link from "next/link";

import { fileOpenActions } from "@/components/catalog/files/file-open-actions";
import { FilePreviewList } from "@/components/catalog/files/file-preview-list";
import { FileSelection } from "@/components/catalog/files/file-selection";
import {
  FILE_NARROW_COLUMN,
  FileAddedOn,
  FileAuthor,
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
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { SelectAllHead, SelectRowCell } from "@/components/ui/row-selection";
import { StatusBadge } from "@/components/ui/status-badge";
import { fileFormat, formatFileSize } from "@/lib/catalog/file-rules";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { library } from "@/lib/i18n/fr/library";
import type { LibraryFile } from "@/lib/library/queries";
import { formatShortDate } from "@/lib/release/format";
import { cn } from "@/lib/utils";

const fr = { catalogFiles, library };

// Every readable file, newest first: its name opens it large over the list
// (FilePreviewList), ← → to the next one; what it
// belongs to links to that library (where it is edited and versioned); "⋯"
// opens or downloads it; several ticked ones are opened or downloaded
// together (FileSelection).
export function LibraryTable({ files }: { files: LibraryFile[] }) {
  const t = fr.library;
  const previews = files.map((file) => ({
    ...file,
    context: file.ownerLabel || t.sources[file.source],
  }));

  return (
    <FilePreviewList files={previews}>
      <FileSelection
        files={files.map(({ id, downloadUrl }) => ({ id, downloadUrl }))}
      >
        <DataTable>
          <DataTableHeader>
            <SelectAllHead label={fr.catalogFiles.selection.all} />
            {/* One fact a column (after Accordee, Sacha 24/11/2026). */}
            <DataTableHead icon="file" fill>
              {t.columns.name}
            </DataTableHead>
            <DataTableHead icon="attached" hideBelow="md">
              {t.columns.owner}
            </DataTableHead>
            <DataTableHead icon="source" hideBelow="lg">
              {t.columns.source}
            </DataTableHead>
            <DataTableHead icon="kind" hideBelow="lg">
              {t.columns.category}
            </DataTableHead>
            <DataTableHead
              icon="format"
              hideBelow="xl"
              className={FILE_NARROW_COLUMN}
            >
              {t.columns.type}
            </DataTableHead>
            <DataTableHead
              icon="size"
              hideBelow="2xl"
              align="end"
              className={FILE_NARROW_COLUMN}
            >
              {t.columns.size}
            </DataTableHead>
            <DataTableHead icon="person" hideBelow="2xl">
              {t.columns.addedBy}
            </DataTableHead>
            <DataTableHead icon="date" hideBelow="md">
              {t.columns.addedAt}
            </DataTableHead>
            <DataTableActionsHead label={t.columns.actions} />
          </DataTableHeader>
          <DataTableBody>
            {files.map((file) => {
              const source = t.sources[file.source];
              const format = fileFormat(file.fileName, file.mime);
              const size = formatFileSize(file.bytes);
              return (
                <DataTableRow key={file.id}>
                  <SelectRowCell
                    row={{ id: file.id, name: file.fileName }}
                    label={fr.catalogFiles.selection.row(file.fileName)}
                  />
                  <DataTableCell fill>
                    <FileNameMedia
                      file={file}
                      previewUrl={file.openUrl}
                      subtitle={
                        <>
                          {/* On a phone, the hidden columns. */}
                          <span className="md:hidden">
                            {[
                              source,
                              file.ownerLabel,
                              format,
                              size,
                              formatShortDate(file.createdAt),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          <span className="hidden md:inline">
                            {[
                              file.versionCount > 1 &&
                                fr.catalogFiles.versions.badge(file.version),
                              file.description,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </>
                      }
                    />
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    <Link
                      href={file.ownerHref}
                      aria-label={t.openOwner(source, file.ownerLabel)}
                      className="relative z-10 block max-w-48 truncate rounded-md outline-none hover:underline focus-visible:underline"
                    >
                      {file.ownerLabel || EMPTY_CELL}
                    </Link>
                  </DataTableCell>
                  {/* What it belongs to, its own column (Sacha 25/11/2026). */}
                  <DataTableCell hideBelow="lg">{source}</DataTableCell>
                  <DataTableCell hideBelow="lg">
                    <StatusBadge tone="neutral" size="sm">
                      {file.categoryLabel}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell hideBelow="xl" className={FILE_NARROW_COLUMN}>
                    {format}
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="2xl"
                    align="end"
                    className={cn(FILE_NARROW_COLUMN, "tabular-nums")}
                    sort={file.bytes}
                  >
                    {size}
                  </DataTableCell>
                  <DataTableCell hideBelow="2xl">
                    <FileAuthor name={file.authorName} />
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    <FileAddedOn createdAt={file.createdAt} />
                  </DataTableCell>
                  <DataTableActionsCell>
                    <RowActions
                      label={fr.catalogFiles.menu.label(file.fileName)}
                      actions={fileOpenActions(file)}
                    />
                  </DataTableActionsCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </FileSelection>
    </FilePreviewList>
  );
}
