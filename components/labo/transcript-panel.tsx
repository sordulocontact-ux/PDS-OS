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

  // Each moment can be linked to (« Voir le passage » of a Cadrage source,
  // PROJ-BUG-02): the first segment starting at that second carries its id.
  const used = new Set<number>();
  const anchorOf = (start: number) => {
    const second = Math.floor(start);
    if (used.has(second)) return undefined;
    used.add(second);
    return `t-${second}`;
  };

  return (
    <ol className="max-h-80 space-y-1.5 overflow-y-auto text-sm">
      {transcript.segments.map((segment, index) => (
        <li
          key={index}
          id={anchorOf(segment.start)}
          className="grid scroll-mt-2 grid-cols-[3rem_1fr] gap-3 rounded-md target:bg-[var(--tone-info-bg)] target:text-[color:var(--tone-info-fg)]"
        >
          <span className="pt-0.5 font-mono text-xs text-muted-foreground">
            {formatTimestamp(segment.start)}
          </span>
          <span>{segment.text}</span>
        </li>
      ))}
    </ol>
  );
}
