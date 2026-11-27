import { ViewLink } from "@/components/ui/view-link";
import type { CallListItem } from "@/lib/calls/queries";
import { calendar } from "@/lib/i18n/fr/calendar";
import { formatSlot } from "@/lib/calls/format";

const fr = { calendar };

/**
 * « À venir »: the next calls, as cards (title, day and hour, project), each
 * opening its call. Nothing coming: nothing shown, no empty sentence.
 */
export function UpcomingCalls({ calls }: { calls: CallListItem[] }) {
  if (calls.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-caption text-grey-400">
        {fr.calendar.side.upcoming}
      </h2>
      <ul className="flex flex-col gap-2">
        {calls.map((call) => (
          <li key={call.id}>
            <ViewLink
              href={call.href}
              className="flex flex-col gap-0.5 rounded-xl border border-[color:var(--border-hairline)] bg-card p-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]"
            >
              <span className="truncate text-sm font-semibold">
                {call.title}
              </span>
              <span className="truncate text-[length:var(--type-micro)] text-muted-foreground">
                {formatSlot(call)}
              </span>
              {call.projectTitle && (
                <span className="truncate text-[length:var(--type-micro)] text-muted-foreground">
                  {call.projectTitle}
                </span>
              )}
            </ViewLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
