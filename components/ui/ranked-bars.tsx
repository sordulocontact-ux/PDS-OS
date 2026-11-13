import { cn } from "@/lib/utils";

export type RankedBar = {
  key: string;
  label: string;
  value: number;
  // The value as said (« 12 400 € HT »).
  display: string;
  // One line under the label (« 1 200 € estimés en plus »).
  hint?: string;
};

/**
 * A ranking in thin horizontal bars (Finance, « Par poste », « Par
 * artiste »): the label and its share on the left, the value on the right,
 * a bar under them as long as its share of the largest. Already sorted by
 * the caller; past `limit`, the rest is folded into one last line. The bars
 * are drawn by transform only, in ink: no colour carries the meaning.
 */
export function RankedBars({
  items,
  label,
  limit = 6,
  others,
  share,
  empty,
}: {
  items: RankedBar[];
  // Said to assistive technologies (« Par poste »).
  label: string;
  limit?: number;
  // The folded line (« 3 autres ») and how its value is said.
  others: (count: number, value: number) => { label: string; display: string };
  // The share of the whole a value is (« 34 % »).
  share: (percent: number) => string;
  empty: string;
}) {
  if (items.length === 0)
    return <p className="text-body-md text-muted-foreground">{empty}</p>;
  const whole = items.reduce((sum, item) => sum + item.value, 0);
  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  const restValue = rest.reduce((sum, item) => sum + item.value, 0);
  const rows: (RankedBar & { folded?: boolean })[] = rest.length
    ? [
        ...shown,
        {
          key: "others",
          value: restValue,
          folded: true,
          ...others(rest.length, restValue),
        },
      ]
    : shown;
  const largest = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-body-md">
              <span
                className={cn(
                  "font-medium break-words",
                  row.folded && "text-[color:var(--text-secondary)]",
                )}
              >
                {row.label}
              </span>
              <span className="ml-2 text-caption text-[color:var(--text-tertiary)] tabular-nums">
                {share(whole > 0 ? Math.round((row.value / whole) * 100) : 0)}
              </span>
              {row.hint && (
                <span className="block text-caption text-[color:var(--text-tertiary)]">
                  {row.hint}
                </span>
              )}
            </span>
            <span className="shrink-0 text-body-md font-semibold tabular-nums">
              {row.display}
            </span>
          </div>
          <div
            aria-hidden
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          >
            <div
              className={cn(
                "h-full origin-left rounded-full",
                row.folded ? "bg-chart-3" : "bg-foreground",
              )}
              style={{ transform: `scaleX(${row.value / largest})` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
