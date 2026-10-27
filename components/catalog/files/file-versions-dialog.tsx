"use client";

import { IconEyeOpen } from "nucleo-sharp-essential";

import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { IconDownload } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fileFormat,
  formatFileSize,
  type CatalogFile,
} from "@/lib/catalog/file-rules";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { formatShortDate } from "@/lib/release/format";

const fr = { catalogFiles };

/**
 * Every version of a file, newest first: each one opens in a new tab or
 * downloads under its own name. Read only: a version is replaced by adding
 * a newer one, never edited.
 */
export function FileVersionsDialog({
  file,
  open,
  onOpenChange,
}: {
  file: CatalogFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.catalogFiles;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.versions.title}
      description={t.versions.description}
      closeLabel={t.close}
    >
      <ol className="flex flex-col gap-4">
        {file.versions.map((version) => (
          <li key={version.id} className="flex min-w-0 items-center gap-3">
            <FileTypeIcon file={version} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {t.versions.label(version.version)}
                </span>
                {version.id === file.id && (
                  <StatusBadge tone="info" size="sm">
                    {t.versions.current}
                  </StatusBadge>
                )}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {[
                  version.fileName,
                  fileFormat(version.fileName, version.mime),
                  formatFileSize(version.bytes),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.versions.by(
                  version.authorName,
                  formatShortDate(version.createdAt),
                )}
              </span>
            </div>
            {version.openUrl && (
              <a
                href={version.openUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.open(version.fileName)}
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              >
                <IconEyeOpen aria-hidden />
              </a>
            )}
            {version.downloadUrl && (
              <a
                href={version.downloadUrl}
                aria-label={`${t.menu.download} ${version.fileName}`}
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              >
                <IconDownload aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ol>
    </FormDialog>
  );
}
