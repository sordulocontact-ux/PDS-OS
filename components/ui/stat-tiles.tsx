import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

export type StatTile = {
  label: string;
  value: string;
  // The tile opens the list behind the figure (an artist's masters…).
  href?: string;
  // The tile is a filter of the page it sits on (État du master: only the
  // missing facts): a preloaded view, marked while it is the one shown.
  view?: { current: boolean };
};

// Key figures in bordered tiles: value large, grey label below. A tile with
// an href is a stretched link: the whole tile is clickable, dt/dd stay put.
// Literal classes: Tailwind only generates what it reads in full.
const columnClasses = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-3 lg:grid-cols-6",
} as const;

export function StatTiles({
  stats,
  columns = 4,
}: {
  stats: StatTile[];
  // Tiles per row from sm up (4 by default, 3 for Juridique, 6 for the budget).
  columns?: keyof typeof columnClasses;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3", columnClasses[columns])}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "relative flex flex-col-reverse gap-1 rounded-2xl border border-border p-3",
            stat.href &&
              "transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted",
            // An active filter is in ink, like an active FilterChip.
            stat.view?.current && "border-foreground bg-muted",
          )}
        >
          <dt className="text-caption text-[color:var(--text-secondary)]">
            {stat.label}
          </dt>
          <dd className="text-body-xl font-medium tabular-nums">
            {stat.href && stat.view ? (
              <ViewLink
                href={stat.href}
                aria-current={stat.view.current || undefined}
                className="outline-none after:absolute after:inset-0 after:rounded-2xl"
              >
                {stat.value}
                <span className="sr-only"> {stat.label}</span>
              </ViewLink>
            ) : stat.href ? (
              <Link
                href={stat.href}
                className="outline-none after:absolute after:inset-0 after:rounded-2xl"
              >
                {stat.value}
                <span className="sr-only"> {stat.label}</span>
              </Link>
            ) : (
              stat.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StatTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-2xl" />
      ))}
    </div>
  );
}
