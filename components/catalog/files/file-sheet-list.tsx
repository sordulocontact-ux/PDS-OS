"use client";

import {
  FilePreviewLink,
  FilePreviewList,
} from "@/components/catalog/files/file-preview-list";
import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { OverflowHintArea } from "@/components/ui/overflow-hint";
import { formatFileSize } from "@/lib/catalog/file-rules";
import type { PreviewFile } from "@/lib/catalog/file-type";

/**
 * The files of a record in its side sheet (the fold « Fichiers » of the
 * summary card, § 6.7 bis): the icon of each type, its name opening the
 * preview over the sheet, its size.
 */
export function FileSheetList({ files }: { files: PreviewFile[] }) {
  return (
    <FilePreviewList files={files}>
      {/* A long name, whole on hover. */}
      <OverflowHintArea className="contents">
        {files.map((file) => (
          <div
            key={file.id}
            className="relative flex min-w-0 [transform:translate(0)] items-center gap-3"
          >
            <FileTypeIcon file={file} size="sm" />
            <span className="flex min-w-0 flex-1">
              <FilePreviewLink file={file} />
            </span>
            {file.bytes !== null && (
              <span className="shrink-0 text-caption text-[color:var(--text-secondary)] tabular-nums">
                {formatFileSize(file.bytes)}
              </span>
            )}
          </div>
        ))}
      </OverflowHintArea>
    </FilePreviewList>
  );
}
