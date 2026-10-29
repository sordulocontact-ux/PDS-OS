import type { CallDetail } from "@/lib/calls/queries";
import { formatMegabytes } from "@/lib/calls/format";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/** The stored recording, to listen back: each take in order when in parts. */
export function CallAudio({
  call,
  audioUrls,
}: {
  call: CallDetail;
  audioUrls: Array<string | null>;
}) {
  const t = fr.calls.audio;
  const parts = audioUrls.length > 1;
  return (
    <div className="grid gap-2">
      {audioUrls.length === 0 || audioUrls.some((url) => url === null) ? (
        <p className="text-sm text-muted-foreground">{t.playerUnavailable}</p>
      ) : (
        audioUrls.map((url, i) => (
          <div key={url} className="grid gap-1">
            {parts && (
              <p className="text-xs text-muted-foreground">{t.part(i + 1)}</p>
            )}
            <audio
              controls
              preload="metadata"
              src={url ?? undefined}
              className="w-full"
            >
              <track kind="captions" />
            </audio>
          </div>
        ))
      )}
      {call.audioBytes !== null && (
        <p className="text-xs text-muted-foreground">
          {call.audioMime} · {t.size(formatMegabytes(call.audioBytes))}
        </p>
      )}
    </div>
  );
}
