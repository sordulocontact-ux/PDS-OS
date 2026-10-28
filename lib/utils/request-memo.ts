import { cache } from "react";

import { addDeps, collecting } from "@/lib/projects/live-deps";

/**
 * React's `cache` for a function whose arguments are objects (a project, a
 * list of titles): `keyOf` says which calls are the same, and they share one
 * result for the rest of the request. Like `cache`, it memoizes only while
 * rendering: a Server Action or a route handler reads afresh each time (the
 * « before / after » of lib/journey/outcome.ts stays true). Results are
 * shared: callers never change them. Every caller records what the shared
 * call read (lib/projects/live-deps.ts), as with trackedCache.
 */
export function memoPerRequest<A extends unknown[], R>(
  keyOf: (...args: A) => string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const store = cache(
    () => new Map<string, { result: Promise<R>; deps: Set<string> }>(),
  );
  return async (...args: A) => {
    const memo = store();
    const key = keyOf(...args);
    let shared = memo.get(key);
    if (!shared) {
      shared = collecting(() => fn(...args));
      memo.set(key, shared);
    }
    const value = await shared.result;
    addDeps(shared.deps);
    return value;
  };
}

/** The key of a call by all its arguments (plain data read from the
 * database: a project, an access, a stage). */
export const argsKey = (...args: unknown[]) => JSON.stringify(args);
