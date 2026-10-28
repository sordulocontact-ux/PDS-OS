import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";

// What a computed view of a project read (page loads audit of 28/10/2026,
// docs/ARCHITECTURE.md § 3 bis, « Cache par table »). A view kept by
// byProjectVersion (lib/projects/version-cache.ts) is computed again only
// when one of the tables it read changed in the project (project_live.tables,
// 20261028000101_project_live_tables.sql), no longer after any write of the
// project: a constraint of the Cadrage no longer computes the Master, the
// Juridique and the Distribution again.
//
// Each request a view sends is recorded here, by the fetch of the server's
// Supabase client: `t:<table>` for a table and the tables it embeds,
// `r:<function>` for a function (its tables come from the database,
// live_rpc_tables). A read shared by React's `cache` (getProject, the
// access…) leaves once per render, for whichever view asked first: wrapped
// in trackedCache instead, every view that awaits it records its tables too.
// A view that reads another kept view records that view's tables.

type Stack = Set<string>[];

const collectors = new AsyncLocalStorage<Stack>();

// Requests sent by each view being computed (PERF_TRACE only reads it).
const sent = new WeakMap<Set<string>, number>();

/** Records a read for every view being computed around it. */
function record(dep: string) {
  for (const set of collectors.getStore() ?? []) set.add(dep);
}

/** How many requests a view's computation sent itself (PERF_TRACE). */
export const requestsOf = (deps: Set<string>) => sent.get(deps) ?? 0;

/** Adds the reads of a finished computation (a shared or kept one). */
export function addDeps(deps: Iterable<string>) {
  const stack = collectors.getStore();
  if (!stack?.length) return;
  for (const dep of deps) for (const set of stack) set.add(dep);
}

/** Runs `run` and gives back what it read, itself and below it. */
export function collecting<T>(run: () => T): { result: T; deps: Set<string> } {
  const deps = new Set<string>();
  const result = collectors.run([...(collectors.getStore() ?? []), deps], run);
  return { result, deps };
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { then?: unknown }).then === "function";

/**
 * React's `cache`, whose every caller also records what the shared read
 * read (see above). Same behaviour otherwise: once per render, nothing kept
 * in a Server Action.
 */
export function trackedCache<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const shared = cache((...args: A) => collecting(() => fn(...args)));
  return (...args: A) => {
    const { result, deps } = shared(...args);
    if (!isThenable(result)) return result;
    return Promise.resolve(result).then((value) => {
      addDeps(deps);
      return value;
    }) as R;
  };
}

// The tables a request reads: the one in its path and every resource its
// `select` embeds (`call:calls!inner(id, call_reports(id))`).
const EMBED = /([a-z_][a-z0-9_]*)(?:![a-z0-9_]+)?\(/g;

/** Records the reads of a request to the database's REST API. */
export function recordRequest(input: RequestInfo | URL) {
  if (!collectors.getStore()?.length) return;
  let url: URL;
  try {
    url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
  } catch {
    return;
  }
  const path = url.pathname.match(/\/rest\/v1\/(rpc\/)?([a-z_][a-z0-9_]*)/);
  if (!path) return;
  for (const set of collectors.getStore() ?? [])
    sent.set(set, (sent.get(set) ?? 0) + 1);
  if (path[1]) return record(`r:${path[2]}`);
  record(`t:${path[2]}`);
  for (const [, name] of (url.searchParams.get("select") ?? "").matchAll(EMBED))
    record(`t:${name}`);
}

/** Runs a read that belongs to no view (the project's stamps themselves). */
export function untracked<T>(run: () => PromiseLike<T>): Promise<T> {
  return collectors.run([], async () => await run());
}

/** The server client's fetch, recording what each view reads. */
export function trackingFetch(next: typeof fetch): typeof fetch {
  return (input, init) => {
    recordRequest(input);
    return next(input, init);
  };
}

/** A project's stamps: its version and the version of each of its tables. */
export type LiveStamps = { version: number; tables: Record<string, number> };

/** The tables something depends on, or every table. */
export type Tables = string[] | "all";

// What decides which rows a reader sees (RLS): a change there can change a
// view or an answer that never read them.
export const VISIBILITY = [
  "can_see_project",
  "can_see_project_row",
  "visible_project_ids",
  "has_permission",
  "auth_person_id",
];

/** What each database function reads and whether it can write, as the
 * database says it (live_rpc_reads), once per server instance; null:
 * unknown to the database. Filled by lib/projects/version-cache.ts. */
export const functionReads = new Map<
  string,
  { tables: string[]; readOnly: boolean } | null
>();

/** The tables `deps` stand for, with what decides visibility; null while a
 * function among them is not known yet, "all" when one cannot be known. */
export function tablesOfDeps(deps: Iterable<string>): Tables | null {
  const tables = new Set<string>();
  const functions = [...VISIBILITY];
  for (const dep of deps) {
    if (dep.startsWith("t:")) tables.add(dep.slice(2));
    else if (dep.startsWith("r:")) functions.push(dep.slice(2));
  }
  for (const name of functions) {
    if (!functionReads.has(name)) return null;
    const reads = functionReads.get(name);
    if (!reads) return "all";
    for (const table of reads.tables) tables.add(table);
  }
  return [...tables];
}

/** Whether none of `tables` changed between two stamps of a project. */
export function unchanged(tables: Tables, seen: LiveStamps, now: LiveStamps) {
  if (seen.version === now.version) return true;
  if (tables === "all") return false;
  return tables.every(
    (table) => (seen.tables[table] ?? 0) === (now.tables[table] ?? 0),
  );
}

/** The view being computed: its project, the project's stamps read before
 * it, and its reader (lib/projects/request-cache.ts keys answers by them). */
export type ViewScope = { projectId: string; now: LiveStamps; reader: string };

const views = new AsyncLocalStorage<ViewScope>();

export const currentView = () => views.getStore() ?? null;

/** Runs a view's computation in its scope. */
export function inView<T>(scope: ViewScope, run: () => T): T {
  return views.run(scope, run);
}
