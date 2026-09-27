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
