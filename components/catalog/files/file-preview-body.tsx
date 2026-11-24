"use client";

import { FilePreviewText } from "@/components/catalog/files/file-preview-text";
import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { IconDownload } from "@/components/icons";
import { AudioFile } from "@/components/ui/audio-file";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { previewKind, type PreviewFile } from "@/lib/catalog/file-type";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";

const fr = { catalogFiles };

/**
 * The file itself, on the sunken surface: a PDF in the browser's reader, an
 * image fitted, a sound in the app's player, a video with its controls, a
 * text or a CSV read here (as a spreadsheet for a CSV); any other type its
 * large icon, its name and « Télécharger ».
 */
export function FilePreviewBody({ file }: { file: PreviewFile }) {
  const kind = file.openUrl ? previewKind(file) : "none";
  const url = file.openUrl ?? "";
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]">
      {kind === "pdf" ? (
        <iframe
          src={url}
          title={file.fileName}
          className="size-full border-0"
        />
      ) : kind === "image" ? (
        // A signed link to a private file: next/image would not proxy it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.fileName}
          className="m-auto max-h-full max-w-full object-contain p-4"
        />
      ) : kind === "video" ? (
        <video
          src={url}
          controls
          preload="metadata"
          className="m-auto max-h-full max-w-full"
        />
      ) : kind === "audio" ? (
        <div className="m-auto w-full max-w-xl p-6">
          <AudioFile
            label={fr.catalogFiles.preview.listen(file.fileName)}
            listenUrl={url}
            downloadUrl={file.downloadUrl}
          />
        </div>
      ) : kind === "csv" || kind === "text" ? (
        <FilePreviewText url={url} csv={kind === "csv"} />
      ) : (
        <Unavailable file={file} />
      )}
    </div>
  );
}

function Unavailable({ file }: { file: PreviewFile }) {
  const t = fr.catalogFiles.preview;
  return (
    <div className="m-auto flex max-w-md flex-col items-center gap-3 p-6 text-center">
      <FileTypeIcon file={file} size="lg" />
      <p className="max-w-full truncate font-medium">{file.fileName}</p>
      <p className="text-[color:var(--text-secondary)]">{t.unavailable}</p>
      {file.downloadUrl && (
        <a
          href={file.downloadUrl}
          className={buttonVariants({ className: "mt-2" })}
        >
          <ButtonRoll>
            <IconDownload aria-hidden />
            {t.download}
          </ButtonRoll>
        </a>
      )}
    </div>
  );
}
