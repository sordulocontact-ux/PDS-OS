import { StatusBadge } from "@/components/ui/status-badge";
import type { MeetingLine } from "@/lib/calls/meeting/types";
import { meeting } from "@/lib/i18n/fr/meeting";
import { meetingLineTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { meeting };

const stateLabel = (state: MeetingLine["state"]) => {
  const t = fr.meeting.states;
  return state.kind === "pending" ? t.pending : t[state.kind](state.by);
};

/**
 * One line of a report (proto `crLine`): its nature, who and for when, the
 * line as PO filed it (struck out if discarded), the sentence quoted, what
 * it became when corrected, and its state in the step.
 */
export function MeetingLineRow({ line }: { line: MeetingLine }) {
  const t = fr.meeting;
  const cap = [
    line.kind ? t.kinds[line.kind] : null,
    line.who,
    line.due ? t.forDate(line.due) : null,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-2 border-b border-[var(--border-hairline)] py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="flex min-w-0 flex-col gap-0.5">
        {cap.length > 0 && (
          <span className="text-caption text-[color:var(--text-tertiary)]">
            {cap.join(" · ")}
          </span>
        )}
        <b
          className={cn(
            "text-body-md font-semibold break-words",
            line.state.kind === "discarded" && "line-through",
          )}
        >
          {line.text}
        </b>
        {line.quote && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {t.quote(line.quote)}
          </span>
        )}
        {line.became && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {t.became(line.became)}
          </span>
        )}
      </span>
      <StatusBadge
        tone={meetingLineTone[line.state.kind]}
        size="sm"
        className="shrink-0 self-start"
      >
        {stateLabel(line.state)}
      </StatusBadge>
    </li>
  );
}
