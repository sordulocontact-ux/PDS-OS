import { IconFile } from "nucleo-sharp-essential";

import { FileActions } from "@/components/catalog/artist-page/files/file-actions";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatFileSize, type ArtistFile } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

// Files of the artist, newest first: name and size, category, author, date,
// then download / delete.
export function FilesTable({
  artistId,
  files,
  canDelete,
}: {
  artistId: string;
  files: ArtistFile[];
  canDelete: boolean;
}) {
  const t = fr.artistFiles;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.category}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.addedBy}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.addedAt}</DataTableHead>
        <DataTableHead fill align="end">
          <span className="sr-only">{t.columns.actions}</span>
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {files.map((file) => (
          <DataTableRow key={file.id}>
            <DataTableCell>
              <DataTableMedia
                visual={<DataTableIcon icon={IconFile} />}
                title={<span className="truncate">{file.fileName}</span>}
                subtitle={formatFileSize(file.bytes)}
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              <StatusBadge tone="neutral" size="sm">
                {t.categories[file.category]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              {file.authorName || EMPTY_CELL}
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {formatShortDate(file.createdAt)}
            </DataTableCell>
            <DataTableCell fill align="end">
              <FileActions
                artistId={artistId}
                file={file}
                canDelete={canDelete}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
