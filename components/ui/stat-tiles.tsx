// Key figures in bordered tiles: value large, grey label below.
export function StatTiles({
  stats,
}: {
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col-reverse gap-1 rounded-2xl border border-border p-3"
        >
          <dt className="text-caption text-grey-400">{stat.label}</dt>
          <dd className="text-body-xl font-medium tabular-nums">
            {stat.value}
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
        <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
