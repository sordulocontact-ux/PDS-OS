import type { ReactNode } from "react";

import { MetricCard } from "@/components/ui/metric-card";
import { StatTiles, type StatTile } from "@/components/ui/stat-tiles";
import { cn } from "@/lib/utils";

// Same columns as StatTiles (container queries). Literal classes: Tailwind
// only generates what it reads in full.
const columnClasses = {
  3: "@md:grid-cols-3",
  4: "@xl:grid-cols-4",
  5: "@md:grid-cols-3 @3xl:grid-cols-5",
  6: "@md:grid-cols-3 @4xl:grid-cols-6",
} as const;

// `caption`: what the new style's card says under the figure when it differs
// from the classic `hint` (a rest drawn by `RestAmount`).
export type StatCard = StatTile & { caption?: ReactNode };

/**
 * Key figures of a page: the same `stats` as StatTiles, drawn as
 * MetricCards in the new style (Finance's anatomy, docs/STYLE-FINANCE-
 * PARTOUT.md § 6.5) and as the bordered tiles in the classic one. Once the
 * classic style goes, it replaces StatTiles.
 */
export function StatCards({
  stats,
  columns = 4,
}: {
  stats: StatCard[];
  columns?: keyof typeof columnClasses;
}) {
  return (
    <>
      <div className="modern:hidden">
        <StatTiles stats={stats} columns={columns} />
      </div>
      <div className="@container classic:hidden">
        <div
          className={cn(
            "grid grid-cols-1 gap-4 @md:grid-cols-2",
            columnClasses[columns],
          )}
        >
          {stats.map((stat) => (
            <MetricCard
              key={stat.label}
              title={stat.label}
              value={stat.value}
              caption={stat.caption ?? stat.hint}
              href={stat.href}
              current={stat.view?.current}
            />
          ))}
        </div>
      </div>
    </>
  );
}
