import { DayGroups } from "@/components/ui/day-groups";
import { ViewLink } from "@/components/ui/view-link";
import type { ActivityLine } from "@/lib/overview/activity";
import { formatTime } from "@/lib/project-history/format";

// The project's Activité (proto « Projet complet »): one block per Paris day
// (today, yesterday, then the date), each line « hh:mm **Workflow** · what ·
// who », linked to where it happened when the journal knows.
export function ActivityTimeline({ lines }: { lines: ActivityLine[] }) {
  return (
    <DayGroups items={lines} idPrefix="day" keyOf={(line) => line.id}>
      {(line) => {
        const body = (
          <>
            <time
              dateTime={line.at}
              className="w-12 shrink-0 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)] tabular-nums"
            >
              {formatTime(line.at)}
            </time>
            <span className="min-w-0 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] break-words text-[color:var(--text-secondary)]">
              <b className="font-semibold text-[color:var(--text-primary)]">
                {line.workflow}
              </b>
              {" · "}
              {line.text}
              {line.who && (
                <span className="text-[color:var(--text-tertiary)]">
                  {" · "}
                  {line.who}
                </span>
              )}
            </span>
          </>
        );
        const row = "-mx-2 flex items-baseline gap-4 rounded-lg px-2 py-1.5";
        return line.href ? (
          <ViewLink
            href={line.href}
            prefetch={false}
            className={`${row} no-underline hover:bg-[var(--control-bg-hover)]`}
          >
            {body}
          </ViewLink>
        ) : (
          <div className={row}>{body}</div>
        );
      }}
    </DayGroups>
  );
}
