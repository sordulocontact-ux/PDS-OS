import { IconDownload } from "@/components/icons";
import { core } from "@/lib/i18n/fr/core";

const fr = { audioFile: core.audioFile };

/**
 * An audio file to listen to and download where it is shown (a version of
 * the mix, the master final in the Master and the Distribution): the
 * browser's player, then « Télécharger ». Nothing without a signed link.
 */
export function AudioFile({
  label,
  listenUrl,
  downloadUrl,
}: {
  // Names the player for screen readers: « Écouter la V2 ».
  label: string;
  listenUrl: string | null;
  downloadUrl: string | null;
}) {
  if (!listenUrl) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <audio
        controls
        preload="none"
        src={listenUrl}
        aria-label={label}
        className="h-9 max-w-full"
      />
      {downloadUrl && (
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
        >
          <IconDownload aria-hidden className="size-4" />
          {fr.audioFile.download}
        </a>
      )}
    </div>
  );
}
