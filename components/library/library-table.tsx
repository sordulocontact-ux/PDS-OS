"use client";

import Link from "next/link";

import { fileOpenActions } from "@/components/catalog/files/file-open-actions";
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
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { fileFormat, formatFileSize } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import type { LibraryFile } from "@/lib/library/queries";
import { formatShortDate } from "@/lib/release/format";

// Every readable file, newest first: its name opens it in a new tab; what it
// belongs to links to that library (where it is edited and versioned); "⋯"
// opens or downloads it.
export function LibraryTable({ files }: { files: LibraryFile[] }) {
  const t = fr.library;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.owner}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.category}</DataTableHead>
        <DataTableHead hideBelow="lg" fill>
          {t.columns.addedAt}
        </DataTableHead>
        <DataTableActionsHead label={t.columns.actions} />
      </DataTableHeader>
      <DataTableBody>
        {files.map((file) => {
          const source = t.sources[file.source];
          return (
            <DataTableRow key={file.id}>
              <DataTableCell>
                <DataTableMedia
                  visual={<FileTypeIcon file={file} />}
                  title={
                    <DataTableLink href={file.openUrl} newTab>
                      <span className="sr-only">
                        {fr.catalogFiles.open(file.fileName)}
                      </span>
                      <span aria-hidden>{file.fileName}</span>
                    </DataTableLink>
                  }
                  subtitle={
                    <>
                      {/* The owner column is hidden under md. */}
                      <span className="md:hidden">
                        {source} · {file.ownerLabel} ·{" "}
                      </span>
                      {[
                        file.versionCount > 1 &&
                          fr.catalogFiles.versions.badge(file.version),
                        file.description,
                        fileFormat(file.fileName, file.mime),
                        formatFileSize(file.bytes),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </>
                  }
                />
              </DataTableCell>
              <DataTableCell hideBelow="md">
                <Link
                  href={file.ownerHref}
                  aria-label={t.openOwner(source, file.ownerLabel)}
                  className="relative z-10 flex min-w-0 flex-col rounded-md outline-none hover:underline focus-visible:underline"
                >
                  <span className="text-xs text-muted-foreground">
                    {source}
                  </span>
                  <span className="truncate">
                    {file.ownerLabel || EMPTY_CELL}
                  </span>
                </Link>
              </DataTableCell>
              <DataTableCell hideBelow="sm">
                <StatusBadge tone="neutral" size="sm">
                  {file.categoryLabel}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell hideBelow="lg" fill>
                {formatShortDate(file.createdAt)}
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
  );
}
