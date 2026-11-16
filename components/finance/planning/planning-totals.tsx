import { SignedAmount } from "@/components/ui/signed-amount";
import type { PlanningDay } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";

const t = financePlanning.totals;

/** What the month shows coming in and going out, real and forecast. */
export function PlanningTotals({ days }: { days: PlanningDay[] }) {
  const sum = (key: "inCents" | "outCents") =>
    days.reduce((s, d) => s + d[key], 0);
  return (
    <dl
      aria-label={t.label}
      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-caption"
    >
      {(
        [
          ["in", t.in, sum("inCents")],
          ["out", t.out, sum("outCents")],
        ] as const
      ).map(([direction, label, cents]) => (
        <div key={direction} className="flex items-baseline gap-1.5">
          <dt className="text-[color:var(--text-tertiary)]">{label}</dt>
          <dd className="m-0">
            <SignedAmount event={{ direction, cents }} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
