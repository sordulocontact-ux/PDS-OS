"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { FilePreviewBody } from "@/components/catalog/files/file-preview-body";
import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { IconDownload, IconExternalLink } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IconAction } from "@/components/ui/icon-action";
import { Timestamp } from "@/components/ui/timestamp";
import { formatFileSize } from "@/lib/catalog/file-rules";
import type { PreviewFile } from "@/lib/catalog/file-type";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";

const fr = { catalogFiles };

// Keys the content uses itself: the audio player seeks with the arrows, a
// video and a field move their own cursor.
const OWN_ARROWS = "input, textarea, video, audio, [role='slider']";

/**
 * A file seen large over its list, without leaving it (after Accordee,
 * Sacha 24/11/2026): a centred modal as wide as the image viewer, whatever
 * the style (docs/DESIGN.md § 4, « Modale », a document needs the width).
 * The head on one line: its icon, its name, then in grey what it belongs
 * to, its size and its day; on the right « Ouvrir dans un nouvel onglet »,
 * « Télécharger », then a hairline and the close. The body on the sunken
 * surface draws it by type (FilePreviewBody). ← → go to the previous or
 * next file of the list, Échap closes. Writing (versions, edit, delete)
 * stays in the row's « ⋯ ».
 */
export function FilePreview({
  files,
  currentId,
  open,
  onCurrentChange,
  onClose,
}: {
  files: PreviewFile[];
  currentId: string;
  open: boolean;
  onCurrentChange: (id: string) => void;
  onClose: () => void;
}) {
  const t = fr.catalogFiles.preview;
  const index = files.findIndex((file) => file.id === currentId);
  const file = files[index];
  const go = (step: number) => {
    const next = files[index + step];
    if (next) onCurrentChange(next.id);
  };

  return (
    <Dialog open={open && !!file} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        side="center"
        closeLabel={t.close}
        showClose={false}
        className="h-[calc(100dvh-2rem)] gap-4 sm:h-[calc(100dvh-4rem)] sm:max-w-[var(--dialog-width-viewer)]"
        onKeyDown={(event) => {
          if (event.defaultPrevented) return;
          if (
            event.target instanceof Element &&
            event.target.closest(OWN_ARROWS)
          )
            return;
          if (event.key === "ArrowLeft") go(-1);
          else if (event.key === "ArrowRight") go(1);
        }}
      >
        {file && (
          <>
            <header className="flex min-w-0 items-center gap-3">
              <FileTypeIcon file={file} />
              <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <DialogTitle
                  title={file.fileName}
                  className="min-w-0 truncate text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] sm:max-w-full sm:shrink-0"
                >
                  {file.fileName}
                </DialogTitle>
                <p className="truncate text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]">
                  {[
                    file.context,
                    file.bytes ? formatFileSize(file.bytes) : null,
                  ]
                    .filter(Boolean)
                    .map((part) => `${part} · `)}
                  <Timestamp iso={file.createdAt} show="day" />
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {file.openUrl && (
                  <IconAction
                    label={t.openTab}
                    icon={IconExternalLink}
                    size="icon-sm"
                    onClick={() =>
                      window.open(file.openUrl ?? "", "_blank", "noopener")
                    }
                  />
                )}
                {file.downloadUrl && (
                  <IconAction
                    label={t.download}
                    icon={IconDownload}
                    size="icon-sm"
                    onClick={() =>
                      window.location.assign(file.downloadUrl ?? "")
                    }
                  />
                )}
                <span
                  aria-hidden
                  className="mx-1 h-6 w-px bg-[var(--border-default)]"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.close}
                  title={t.close}
                  onClick={onClose}
                >
                  <IconXmark aria-hidden />
                </Button>
              </div>
            </header>
            <FilePreviewBody key={file.id} file={file} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
