import { IconDownload } from "@/components/icons";
import { AudioPlayer } from "@/components/ui/audio-player";
import { buttonVariants } from "@/components/ui/button";
import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

const fr = { audioFile: core.audioFile };

/**
 * An audio file to listen to and download where it is shown (a version of
 * the mix, the master final in the Master and the Distribution), on
 * Sacha's model (04/11/2026): a rounded frame, its name set in the border
 * when the page does not already show it, the player (play, waveform),
 * then a hairline and « Télécharger » as an icon. Nothing without a signed
 * link.
 */
export function AudioFile({
  label,
  name,
  listenUrl,
  downloadUrl,
  className,
}: {
  // Names the player for screen readers: « Écouter la V2 ».
  label: string;
  // Shown in the frame's border: the file, when nothing above names it.
  name?: string;
  listenUrl: string | null;
  downloadUrl: string | null;
  className?: string;
}) {
  if (!listenUrl) return null;
  return (
    <fieldset
      className={cn(
        "flex max-w-xl min-w-0 items-center gap-3 rounded-2xl border border-[color:var(--border-default)] px-4 pb-3",
        name ? "pt-1" : "pt-3",
        className,
      )}
    >
      {name && (
        <legend className="max-w-full truncate px-1.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {name}
        </legend>
      )}
      <AudioPlayer src={listenUrl} label={label} className="flex-1" />
      {downloadUrl && (
        <>
          <span
            aria-hidden
            className="h-6 w-px shrink-0 bg-[var(--border-default)]"
          />
          <a
            href={downloadUrl}
            aria-label={fr.audioFile.downloadOf(label)}
            title={fr.audioFile.download}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <IconDownload aria-hidden className="size-5" />
          </a>
        </>
      )}
    </fieldset>
  );
}
