import { SignedAmount } from "@/components/ui/signed-amount";
import { MetricCard, MetricCardLink } from "@/components/ui/metric-card";
import type { Flow } from "@/lib/finance/cockpit";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { treasury: treasuryText };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });

/**
 * One side of the money on the overview (after Midday): « À encaisser » or
 * « À payer », its total large, how many and how much is late, then the
 * next three moves, each with its day (« Prévu le … » in red when late) and
 * its project.
 */
export function FlowCard({
  side,
  flow,
  horizon,
  href,
  names,
}: {
  side: "incoming" | "outgoing";
  flow: Flow;
  horizon: number;
  href: string;
  names: Map<string, string>;
}) {
  const o = fr.treasury.overview;
  const t = o[side];
  const caption = [
    side === "incoming"
      ? o.incoming.caption(flow.count)
      : o.outgoing.caption(flow.count, horizon),
    flow.lateCents > 0 && t.late(amount(flow.lateCents)),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <MetricCard
      title={t.title}
      value={amount(flow.cents)}
      caption={caption}
      action={<MetricCardLink href={href}>{t.all}</MetricCardLink>}
    >
      {flow.next.length === 0 ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <ul className="-my-2 divide-y divide-[var(--border-hairline)]">
          {flow.next.map((e) => {
            const source =
              (e.projectId && names.get(e.projectId)) ||
              (e.artistId && names.get(e.artistId));
            return (
              <li
                key={e.key}
                className="flex items-start justify-between gap-3 py-2"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-body-md font-medium">
                    {e.label}
                  </span>
                  <span className="truncate text-caption text-[color:var(--text-secondary)]">
                    {e.dueOn ? (
                      <span className="text-[color:var(--error)]">
                        {o.due(day(e.dueOn))}
                      </span>
                    ) : (
                      day(e.day)
                    )}
                    {source && ` · ${source}`}
                  </span>
                </span>
                <SignedAmount event={e} />
              </li>
            );
          })}
        </ul>
      )}
    </MetricCard>
  );
}
