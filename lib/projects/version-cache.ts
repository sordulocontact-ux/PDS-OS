import "server-only";

import { cache } from "react";

import { getAccess } from "@/lib/auth/dal";
import { getServerEnv } from "@/lib/env";
import { todayInParis } from "@/lib/contracts/types";
import {
  addDeps,
  collecting,
  functionReads,
  inView,
  type LiveStamps,
  providePageScope,
  requestsOf,
  type Tables,
  tablesOfDeps,
  unchanged,
  untracked,
  VISIBILITY,
} from "@/lib/projects/live-deps";
import { createClient } from "@/lib/supabase/server";

// Cache of a project's computed views across requests (page loads audit,
// docs/ARCHITECTURE.md § 3 bis, « Cache des parcours » and « Cache par
// table »). A project's journeys and workflow states cost 65 to 250
// requests; the same person asks for them again on every page of the
// project, every refresh and on the Accueil. They are kept here with:
// - the project's tables as project_live says them, read FIRST: `version`,
//   bumped once per transaction that writes the project, and `tables`, the
//   version at which each table last changed (20261028000101): data read
//   after it is at least as new, so an entry never holds an older state
//   than its stamps say;
// - the tables the view read (lib/projects/live-deps.ts): the entry is
//   served while none of them changed since, whatever else changed. A
//   function the database cannot say the tables of counts as every table;
// - the reader as the database knows them (the whole Access: account,
//   position, permissions), since RLS and the journeys depend on who reads,
//   and the tables RLS reads to decide what a reader sees (VISIBILITY);
// - the day in Paris (overdue steps), and at most TTL_MS old: what is not a
//   table of a project (a name in the Réseau, a catalog file of a title held
//   by no project) and the signed links (15 min at least) stay short-lived.
// A reader without a version row (a project they may not see) is never
// served from here. A view that is not plain data (a function, a class
// instance) is never kept. Concurrent requests for the same entry (a
// hovered link's prefetch, then the click) share one computation.

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 300;

// `kept: false`: the computation failed or is not plain data; whoever waited
// on it computes on its own.
type Kept =
  | { kept: true; value: unknown; deps: string[]; tables: Tables }
  | { kept: false };
type Entry = {
  at: number;
  seen: LiveStamps;
  value: Promise<Kept>;
  settled: Kept | null;
};
const entries = new Map<string, Entry>();
// Views found not to be plain data: computed every time.
const uncacheable = new Set<string>();

/** The project's stamps for the reader, once per request; null when the
 * reader has no row (a project they may not see) or the read failed. */
export const projectLive = cache(
  async (projectId: string): Promise<LiveStamps | null> => {
    const supabase = await createClient();
    const { data, error } = await untracked(() =>
      supabase
        .from("project_live")
        .select("version, tables")
        .eq("project_id", projectId)
        .maybeSingle(),
    );
    if (error) {
      console.error("projectLive:", error.message);
      return null;
    }
    if (!data) return null;
    return {
      version: data.version,
      tables: (data.tables ?? {}) as Record<string, number>,
    };
  },
);

// Whether React's `cache` holds here: in a render, not in a Server Action
// (where the stamps would be read again for every read).
const probe = cache(() => ({}));
const rendering = () => probe() === probe();

// A page's own reads of a project are kept with its stamps and its reader,
// as a view's (lib/projects/request-cache.ts), while rendering.
providePageScope(async (projectId) => {
  if (!rendering()) return null;
  const [access, now] = await Promise.all([
    getAccess(),
    projectLive(projectId),
  ]);
  if (!now || access.state !== "approved") return null;
  return {
    projectId,
    now,
    reader: JSON.stringify([todayInParis(new Date()), access]),
  };
});

/** The project's version for the reader (see projectLive). */
export async function projectVersion(
  projectId: string,
): Promise<number | null> {
  return (await projectLive(projectId))?.version ?? null;
}

export type { LiveStamps } from "@/lib/projects/live-deps";

/** Asks the database what the functions among `deps` (and those deciding
 * visibility) read, once per server instance. */
export async function learnFunctions(deps: Iterable<string>) {
  const names = [
    ...new Set([
      ...VISIBILITY,
      ...[...deps].flatMap((d) => (d.startsWith("r:") ? [d.slice(2)] : [])),
    ]),
  ].filter((name) => !functionReads.has(name));
  if (!names.length) return;
  const supabase = await createClient();
  const { data, error } = await untracked(() =>
    supabase.rpc("live_rpc_reads", { p_names: names }),
  );
  if (error) return;
  const known = (data ?? {}) as Record<
    string,
    { tables: string[]; readOnly: boolean }
  >;
  for (const name of names) functionReads.set(name, known[name] ?? null);
}

async function tablesOf(deps: string[]): Promise<Tables> {
  await learnFunctions(deps);
  return tablesOfDeps(deps) ?? "all";
}

// With PERF_TRACE=1, why each view was computed again (one line each).
function traceMiss(name: string, entry: Entry | undefined, now: LiveStamps) {
  let on = false;
  try {
    on = getServerEnv().PERF_TRACE === "1";
  } catch {}
  if (!on) return;
  const settled = entry?.settled;
  const why = !entry
    ? "new"
    : Date.now() - entry.at >= TTL_MS
      ? "expired"
      : !settled
        ? "computing at another version"
        : !settled.kept
          ? "not kept"
          : settled.tables === "all"
            ? `reads every table (${settled.deps.filter((d) => d.startsWith("r:")).join(", ")})`
            : `changed: ${settled.tables
                .filter(
                  (t) => (entry.seen.tables[t] ?? 0) !== (now.tables[t] ?? 0),
                )
                .join(", ")}`;
  console.info(`[cache] ${name} computed again: ${why}`);
}

// Plain data only: what structuredClone gives back unchanged.
function isPlain(value: unknown, seen = new Set<unknown>()): boolean {
  if (value === null || typeof value !== "object")
    return typeof value !== "function" && typeof value !== "symbol";
  if (seen.has(value)) return true;
  seen.add(value);
  if (value instanceof Date) return true;
  if (value instanceof Map)
    return [...value].every(([k, v]) => isPlain(k, seen) && isPlain(v, seen));
  if (value instanceof Set) return [...value].every((v) => isPlain(v, seen));
  if (Array.isArray(value)) return value.every((v) => isPlain(v, seen));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(value).every((v) => isPlain(v, seen));
}

function remember(key: string, entry: Entry) {
  entries.delete(key);
  entries.set(key, entry);
  // The oldest first in a Map: drop them beyond the cap.
  for (const old of entries.keys()) {
    if (entries.size <= MAX_ENTRIES) break;
    entries.delete(old);
  }
}

// An entry still good for the stamps read now: from the same version (also
// while it computes), or settled and none of its tables changed since.
function servable(entry: Entry | undefined, now: LiveStamps) {
  if (!entry || Date.now() - entry.at >= TTL_MS) return false;
  if (entry.seen.version === now.version) return true;
  const settled = entry.settled;
  if (!settled?.kept || !unchanged(settled.tables, entry.seen, now))
    return false;
  // Good for this version too: later checks start from here.
  entry.seen = now;
  return true;
}

/**
 * `read` kept per project, reader and the tables it read (see above). Its
 * reads are recorded for whoever reads it, kept or not, so a view built on
 * another one depends on that one's tables. No `cache` around it: it
 * shares one computation per request by itself.
 */
export function byProjectVersion<T>(
  name: string,
  read: (projectId: string) => Promise<T>,
): (projectId: string) => Promise<T> {
  return async (projectId) => {
    if (uncacheable.has(name)) return read(projectId);
    const [access, now] = await Promise.all([
      getAccess(),
      projectLive(projectId),
    ]);
    if (now === null || access.state !== "approved") return read(projectId);

    // Who reads, and on which day (overdue steps).
    const reader = JSON.stringify([todayInParis(new Date()), access]);
    const key = JSON.stringify([name, projectId, reader]);
    const hit = entries.get(key);
    if (hit && servable(hit, now)) {
      const found = await hit.value;
      // Each request gets its own copy: nothing it changes reaches another.
      if (found.kept) {
        addDeps(found.deps);
        return structuredClone(found.value) as T;
      }
      return read(projectId);
    }

    traceMiss(name, hit, now);
    // In the view's scope: its reads may be served from the answers kept
    // for this project and reader (lib/projects/request-cache.ts).
    const { result, deps } = collecting(() =>
      inView({ projectId, now, reader }, () => read(projectId)),
    );
    const entry: Entry = {
      at: Date.now(),
      seen: now,
      settled: null,
      value: Promise.resolve(result).then(
        async (value): Promise<Kept> => {
          if (!isPlain(value)) {
            uncacheable.add(name);
            entries.delete(key);
            console.warn(
              `byProjectVersion: ${name} is not plain data, not kept`,
            );
            return { kept: false };
          }
          const list = [...deps];
          return {
            kept: true,
            value: structuredClone(value),
            deps: list,
            tables: await tablesOf(list),
          };
        },
        // A failure (redirect, notFound, error) is never kept.
        (): Kept => {
          entries.delete(key);
          return { kept: false };
        },
      ),
    };
    void entry.value.then((kept) => {
      entry.settled = kept;
    });
    remember(key, entry);
    const started = Date.now();
    const value = await result;
    addDeps(deps);
    if (process.env.PERF_TRACE === "1")
      console.info(
        `[cache] ${name}: ${requestsOf(deps)} requests, ${Date.now() - started} ms`,
      );
    return value;
  };
}
