// Runs every promise at once (one round trip instead of a waterfall) and
// returns their results in order. When several fail, it throws the first
// failure in argument order, not the first in time: put the access check
// first, then the record it guards, then the data, so a redirect to the
// right screen always wins over a "not found" of what RLS hid
// (docs/ARCHITECTURE.md § 3 bis). Every query still runs under RLS, so
// starting one before the access check is known never reveals anything.
export async function allInOrder<const T extends readonly unknown[]>(
  promises: T,
): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
  const settled = await Promise.allSettled(promises);
  const values: unknown[] = [];
  for (const result of settled) {
    if (result.status === "rejected") throw result.reason;
    values.push(result.value);
  }
  return values as { -readonly [K in keyof T]: Awaited<T[K]> };
}

/**
 * Runs `fn` on every item, at most `limit` at a time, and settles each one
 * in order (Promise.allSettled's shape). For a fan-out over many records
 * (every project's journeys) that would otherwise open hundreds of requests
 * at once: the database's gateway then answers « fetch failed ».
 */
export async function settleWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}
