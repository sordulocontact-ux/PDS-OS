import { AudioUpload } from "@/components/calls/audio-upload";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/** « Déposer un fichier audio à la place », folded under the recorder. */
export function AudioUploadFold({
  callId,
  organizationId,
}: {
  callId: string;
  organizationId: string;
}) {
  return (
    <details className="group border-t border-[color:var(--border-hairline)] pt-4">
      <summary className="w-fit cursor-pointer rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        {fr.calls.recorder.or}
      </summary>
      <div className="pt-4">
        <AudioUpload callId={callId} organizationId={organizationId} />
      </div>
    </details>
  );
}
