import { AudioFile } from "@/components/ui/audio-file";
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
