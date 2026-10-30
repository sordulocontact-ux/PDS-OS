import { AudioPlayer } from "@/components/ui/audio-player";
import { masterSource } from "@/lib/i18n/fr/master-source";

const fr = { masterSource };

/** A version to listen to before choosing (proto: the play button of each
 * row): PDS OS's player, nothing without a signed link. */
export function SourceAudio({
  name,
  url,
}: {
  name: string;
  url: string | null;
}) {
  if (!url) return null;
  return (
    <AudioPlayer
      src={url}
      label={fr.masterSource.listen(name)}
      className="w-full max-w-64 sm:w-64"
    />
  );
}
