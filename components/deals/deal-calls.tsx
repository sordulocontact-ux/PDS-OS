import { IconChevronRight } from "nucleo-sharp-essential";

import { callState } from "@/components/calls/call-badges";
import { EmptyNote } from "@/components/shell/empty-state";
import { documentCardClass } from "@/components/ui/document-card-classes";
import { DateTile } from "@/components/ui/date-tile";
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
 * One call of a deal as a card (Sacha 21/11/2026): its day as a calendar
 * leaf (DateTile, strong for one to come), its name, its hours, its state;
 * the whole card opens its page in Calls. In « Calls » and, for the next
 * one, in « Prochaine action ».
 */
export function DealCallCard({ call, now }: { call: DealCall; now: Date }) {
  const upcoming = isUpcoming(call, now);
  const state = callState(call.status, { upcoming, closed: call.closed });
  const hours = call.endsAt
    ? `${formatTime(call.occurredAt)} – ${formatTime(call.endsAt)}`
    : formatTime(call.occurredAt);
  return (
    <ViewLink
      href={routes.call(call.id)}
      className={cn(
        documentCardClass,
        "flex-row items-center gap-3 p-3 transition-colors hover:bg-[var(--control-bg-hover)]",
      )}
    >
      <DateTile iso={call.occurredAt} ahead={upcoming} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold break-words">{call.title}</span>
        <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)] tabular-nums">
          <span className="sr-only">{formatDay(call.occurredAt)}, </span>
          {hours}
        </span>
      </span>
      <StatusBadge tone={state.tone} size="sm">
        {state.label}
      </StatusBadge>
      <IconChevronRight
        aria-hidden
        className="size-4 shrink-0 text-[color:var(--text-tertiary)]"
      />
    </ViewLink>
  );
}

/**
 * The calls of a deal (BIZ 6), the latest first, as an agenda (Sacha
 * 21/11/2026, in place of the frieze of the 20th: « moche »): one
 * DealCallCard a call.
 */
export function DealCalls({ calls }: { calls: DealCall[] }) {
  if (calls.length === 0) return <EmptyNote>{fr.dealCalls.empty}</EmptyNote>;
  const now = new Date();
  return (
    <ul className="flex flex-col gap-2">
      {calls.map((call) => (
        <li key={call.id}>
          <DealCallCard call={call} now={now} />
        </li>
      ))}
    </ul>
  );
}
