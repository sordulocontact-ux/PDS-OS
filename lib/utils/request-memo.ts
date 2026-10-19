import { cache } from "react";

/**
 * React's `cache` for a function whose arguments are objects (a project, a
 * list of titles): `keyOf` says which calls are the same, and they share one
 * result for the rest of the request. Like `cache`, it memoizes only while
 * rendering: a Server Action or a route handler reads afresh each time (the
 * « before / after » of lib/journey/outcome.ts stays true). Results are
 * shared: callers never change them.
 */
export function memoPerRequest<A extends unknown[], R>(
  keyOf: (...args: A) => string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const store = cache(() => new Map<string, Promise<R>>());
  return (...args: A) => {
    const memo = store();
    const key = keyOf(...args);
    let result = memo.get(key);
    if (!result) {
      result = fn(...args);
      memo.set(key, result);
    }
    return result;
  };
}
