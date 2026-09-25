import type { Transcript } from "@/lib/ai/schemas/transcript";
import { fr } from "@/lib/i18n/fr";
import { formatTimestamp } from "@/lib/labo/format";

/** The transcript, segment by segment with its timing when available. */
export function TranscriptPanel({ transcript }: { transcript: Transcript }) {
  if (transcript.segments.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {fr.labo.transcript.noTiming}
        </p>
        <p className="max-h-80 overflow-y-auto text-sm whitespace-pre-wrap">
          {transcript.text}
        </p>
      </div>
    );
  }

  return (
    <ol className="max-h-80 space-y-1.5 overflow-y-auto text-sm">
      {transcript.segments.map((segment, index) => (
        <li key={index} className="grid grid-cols-[3rem_1fr] gap-3">
          <span className="pt-0.5 font-mono text-xs text-muted-foreground">
            {formatTimestamp(segment.start)}
          </span>
          <span>{segment.text}</span>
        </li>
      ))}
    </ol>
  );
}
