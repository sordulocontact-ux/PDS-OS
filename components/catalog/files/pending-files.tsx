import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { fileFormat, formatFileSize } from "@/lib/catalog/file-rules";

// Files chosen but not sent yet, at the top of the add modal: icon, name,
// format and size.
export function PendingFiles({ files }: { files: File[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${index}`}
          className="flex min-w-0 items-center gap-3"
        >
          <FileTypeIcon file={{ fileName: file.name, mime: file.type }} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {[fileFormat(file.name, file.type), formatFileSize(file.size)]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
