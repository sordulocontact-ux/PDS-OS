import { FilePreviewLink } from "@/components/catalog/files/file-preview-list";
import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { Avatar } from "@/components/ui/avatar";
import { DataTableMedia, EMPTY_CELL } from "@/components/ui/data-table";
import { formatShortDate } from "@/lib/release/format";

// Cells shared by every table of files (a library's tab, the global
// library), so a change to how a file reads is made once. One fact a
// column, as Accordee's documents (Sacha 24/11/2026): the name and its
// precision, then the type, the size, who added it and when, each alone;
// on a phone, where those columns are hidden, they go under the name.

/**
 * The file: its picture or the icon of its type, its name (opens it large
 * over the list inside a `FilePreviewList`, else in a new tab) and what is
 * said beside it.
 */
export function FileNameMedia({
  file,
  previewUrl,
  subtitle,
}: {
  file: { id: string; fileName: string; mime: string; openUrl: string | null };
  previewUrl?: string | null;
  subtitle: React.ReactNode;
}) {
  return (
    <DataTableMedia
      visual={<FileTypeIcon file={file} previewUrl={previewUrl} />}
      title={<FilePreviewLink file={file} />}
      subtitle={subtitle}
    />
  );
}

/** A narrow column (a file's type, its size): one short fact. */
export const FILE_NARROW_COLUMN = "w-24";

/** Who added the file, with their avatar (its own column, after Accordee). */
export function FileAuthor({ name }: { name: string }) {
  if (!name) return EMPTY_CELL;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} pictureUrl={null} className="size-6" />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** The day the file was added (its own column). */
export function FileAddedOn({ createdAt }: { createdAt: string }) {
  return (
    <time dateTime={createdAt} className="tabular-nums">
      {formatShortDate(createdAt)}
    </time>
  );
}
