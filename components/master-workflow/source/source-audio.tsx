import { fr } from "@/lib/i18n/fr";

/** A version to listen to before choosing (proto: the play button of each
 * row): the browser's player, nothing without a signed link. */
export function SourceAudio({
  name,
  url,
}: {
  name: string;
  url: string | null;
}) {
  if (!url) return null;
  return (
    <audio
      controls
      preload="none"
      src={url}
      aria-label={fr.masterSource.listen(name)}
      className="h-9 w-full max-w-64 sm:w-64"
    />
  );
}
