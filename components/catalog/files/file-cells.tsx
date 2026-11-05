import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { DataTableLink, DataTableMedia } from "@/components/ui/data-table";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { formatShortDate } from "@/lib/release/format";

const fr = { catalogFiles };

// Cells shared by every table of files (a library's tab, the global
// library), so a change to how a file reads is made once.

/**
 * The file: its picture or icon, its name (opens it in a new tab, a long
 * name cut with the whole name on hover, Sacha 29/10) and what is said
 * under it.
 */
export function FileNameMedia({
  file,
  previewUrl,
  subtitle,
}: {
  file: { fileName: string; mime: string; openUrl: string | null };
  previewUrl?: string | null;
  subtitle: React.ReactNode;
}) {
  return (
    <DataTableMedia
      visual={<FileTypeIcon file={file} previewUrl={previewUrl} />}
      title={
        <DataTableLink href={file.openUrl} newTab>
          <span className="sr-only">{fr.catalogFiles.open(file.fileName)}</span>
          <span
            aria-hidden
            title={file.fileName}
            className="block max-w-80 truncate"
          >
            {file.fileName}
          </span>
        </DataTableLink>
      }
      subtitle={subtitle}
    />
  );
}

/** When the file was added, and by whom under it. */
export function FileAdded({
  createdAt,
  authorName,
}: {
  createdAt: string;
  authorName: string;
}) {
  return (
    <span className="flex min-w-0 flex-col">
      <span>{formatShortDate(createdAt)}</span>
      {authorName && (
        <span className="truncate text-sm text-muted-foreground">
          {authorName}
        </span>
      )}
    </span>
  );
}
