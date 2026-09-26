import Link from "next/link";
import { IconChevronRight } from "nucleo-sharp-essential";

import { CallStatusBadge, ConsentBadge } from "@/components/calls/call-badges";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime, isUpcoming } from "@/lib/calls/format";
import type { CallSummary } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";

/** One row per call; the whole row is the link. Stacks on small screens. */
export function CallList({
  projectId,
  calls,
  now,
}: {
  projectId: string;
  calls: CallSummary[];
  // Reference time for "À venir", taken once by the page.
  now: Date;
}) {
  const t = fr.calls.list.columns;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {calls.map((call) => (
        <li key={call.id}>
          <Link
            href={routes.projectCall(projectId, call.id)}
            className="flex min-h-14 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[1fr_11rem] sm:items-center sm:gap-4">
              <span className="truncate text-sm font-medium">{call.title}</span>
              <time
                dateTime={call.occurredAt}
                className="text-sm text-muted-foreground"
              >
                {formatDateTime(call.occurredAt)}
              </time>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="sr-only">{t.consent} :</span>
              <ConsentBadge consent={call.consent} />
              <span className="sr-only">{t.status} :</span>
              <CallStatusBadge
                status={call.status}
                upcoming={isUpcoming(call, now)}
              />
            </div>
            <IconChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
