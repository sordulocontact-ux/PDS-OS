/** A copy of the list with the item at `index` moved by `delta` places. */
export function move<T>(list: readonly T[], index: number, delta: number): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item);
  return next;
}
