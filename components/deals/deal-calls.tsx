import { callState } from "@/components/calls/call-badges";
import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { formatTime, isUpcoming } from "@/lib/calls/format";
import type { DealCall } from "@/lib/deals/call-queries";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";

const fr = { dealCalls };

/**
 * The calls of a deal (BIZ 6), the latest first, as a frieze in time (Sacha
 * 20/11/2026, proto « Fiche d'un deal » v2): the day and hour on the left, a
 * point on the line (hollow for one to come), its name and state on the
 * right; the name opens its page in Calls (record, report, closure — the
 * same page as every call).
 */
export function DealCalls({ calls }: { calls: DealCall[] }) {
  if (calls.length === 0) return <EmptyNote>{fr.dealCalls.empty}</EmptyNote>;
  const now = new Date();
  return (
    <ol className="flex flex-col">
      {calls.map((call, i) => {
        const upcoming = isUpcoming(call, now);
        const state = callState(call.status, { upcoming, closed: call.closed });
        return (
          <li
            key={call.id}
            className="grid grid-cols-[minmax(0,7rem)_1rem_minmax(0,1fr)] gap-3"
          >
            <span className="flex flex-col items-end pt-0.5 text-right">
              <span className="text-body-sm font-semibold">
                {formatDay(call.occurredAt)}
              </span>
              <span className="text-caption text-[color:var(--text-tertiary)] tabular-nums">
                {formatTime(call.occurredAt)}
              </span>
            </span>
            <span className="relative flex justify-center">
              {i < calls.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-3 -bottom-3 w-px bg-[var(--border-default)]"
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative mt-2 size-2.5 rounded-full border-[1.5px] border-foreground",
                  upcoming ? "bg-background" : "bg-foreground",
                )}
              />
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1 pb-5">
              <ViewLink
                href={routes.call(call.id)}
                aria-label={fr.dealCalls.open(call.title)}
                className="font-semibold break-words underline-offset-2 hover:underline"
              >
                {call.title}
              </ViewLink>
              <StatusBadge tone={state.tone} size="sm">
                {state.label}
              </StatusBadge>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
