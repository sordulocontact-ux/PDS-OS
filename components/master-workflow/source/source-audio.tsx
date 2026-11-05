import { AudioFile } from "@/components/ui/audio-file";
import { AudioPlayer } from "@/components/ui/audio-player";
import { masterSource } from "@/lib/i18n/fr/master-source";

const fr = { masterSource };

/** The version shown on the step's cards (« Source du mix », the newer one):
 * the framed `AudioFile` like everywhere else, with its download. */
export function SourceAudioFile({
  name,
  listenUrl,
  downloadUrl,
}: {
  name: string;
  listenUrl: string | null;
  downloadUrl: string | null;
}) {
  return (
    <AudioFile
      name={name}
      label={fr.masterSource.listen(name)}
      listenUrl={listenUrl}
      downloadUrl={downloadUrl}
      className="max-w-none"
    />
  );
}

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
