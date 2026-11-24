// The treasury's curve as a line (Sacha 24/11/2026: « pourquoi c'est pas
// fluide », the steps jumped on each move's day). A balance known every day
// is drawn through one point a week, counted from today, plus the days that
// must show (today, the low point, the ends): every point drawn is a real
// balance of its day, joined by straight lines as Midday draws its reports.
// Client-safe, pure code.

export const LINE_EVERY_DAYS = 7;

/** The indices of the daily points the line goes through, in order. */
export function lineIndices(
  count: number,
  anchor: number,
  keep: number[] = [],
): number[] {
  if (count <= 0) return [];
  const from = Math.min(Math.max(anchor, 0), count - 1);
  const picked = new Set<number>([0, count - 1, from]);
  for (const i of keep) if (i >= 0 && i < count) picked.add(i);
  for (let i = from; i < count; i += LINE_EVERY_DAYS) picked.add(i);
  for (let i = from; i >= 0; i -= LINE_EVERY_DAYS) picked.add(i);
  return [...picked].sort((a, b) => a - b);
}

/** Straight lines through the points. */
export function linePath(points: { x: number; y: number }[]) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join("");
}

/** The picked index nearest to `index`. */
export function nearestIndex(picked: number[], index: number) {
  return picked.reduce(
    (best, i) => (Math.abs(i - index) < Math.abs(best - index) ? i : best),
    picked[0] ?? 0,
  );
}
