import { callState } from "@/components/calls/call-badges";
import { EmptyNote } from "@/components/shell/empty-state";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { routes } from "@/lib/auth/redirects";
import { isUpcoming } from "@/lib/calls/format";
import { callWhen } from "@/lib/calls/sheet";
import type { DealCall } from "@/lib/deals/call-queries";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";

const fr = { dealCalls };

/**
 * The calls of a deal (BIZ 6), the latest first: when, its name, its state;
 * each opens its page in Calls (record, report, closure — the same page as
 * every call).
 */
export function DealCalls({ calls }: { calls: DealCall[] }) {
  if (calls.length === 0) return <EmptyNote>{fr.dealCalls.empty}</EmptyNote>;
  const now = new Date();
  return (
    <FactRows>
      {calls.map((call) => (
        <FactRow
          key={call.id}
          label={callWhen(call)}
          value={call.title}
          state={callState(call.status, {
            upcoming: isUpcoming(call, now),
            closed: call.closed,
          })}
          href={routes.call(call.id)}
          hrefLabel={fr.dealCalls.open(call.title)}
        />
      ))}
    </FactRows>
  );
}
