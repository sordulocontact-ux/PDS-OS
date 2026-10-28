import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { cache } from "react";

import { getAccess } from "@/lib/auth/dal";
import { getServerEnv } from "@/lib/env";
import { todayInParis } from "@/lib/contracts/types";
import {
  addDeps,
  apart,
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
  type ViewScope,
  VISIBILITY,
} from "@/lib/projects/live-deps";
import { holdsSignedLink, isPlain } from "@/lib/projects/plain-data";
import {
  createClient,
  requestCookies,
  withCookies,
} from "@/lib/supabase/server";

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
// - the day in Paris (overdue steps), and fresh for TTL_MS: what is not a
//   table of a project (a name in the Réseau, a catalog file of a title held
//   by no project) is read again after that. Past it, and up to STALE_MS, an
//   entry whose tables did not change is still served once while it is
//   computed again in the background (after the response): coming back to a
//   project after a break no longer waits for its 260 requests, only what is
//   not a table of the project may show its state of before the break, until
//   the next page. A view holding a signed Storage link (15 min at least)
//   is never served past TTL_MS.
// A reader without a version row (a project they may not see) is never
// served from here. A view that is not plain data (a function, a class
// instance) is never kept. Concurrent requests for the same entry (a
// hovered link's prefetch, then the click) share one computation.

const TTL_MS = 5 * 60_000;
// A working day: the reader's key changes at midnight anyway.
const STALE_MS = 8 * 60 * 60_000;
const MAX_ENTRIES = 300;
// A background computation's session must outlive it by far: a client that
// renewed it then could not hand the new cookies back, and the browser's
// own refresh token would be refused afterwards (rotation).
const SESSION_MARGIN_MS = 10 * 60_000;

// `kept: false`: the computation failed or is not plain data; whoever waited
// on it computes on its own.
type Kept =
  | {
      kept: true;
      value: unknown;
      deps: string[];
      tables: Tables;
      signed: boolean;
    }
  | { kept: false };
type Entry = {
  at: number;
  seen: LiveStamps;
  value: Promise<Kept>;
  settled: Kept | null;
  // Being computed again in the background (served past its time).
  refreshing?: boolean;
};
const entries = new Map<string, Entry>();
// Views found not to be plain data: computed every time.
const uncacheable = new Set<string>();
// Inside a background computation: the views it reads must be fresh, or
// it would keep their old state as new.
const refreshing = new AsyncLocalStorage<true>();

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
// "stale": past TTL_MS, served while it is computed again (see above).
function servable(
  entry: Entry | undefined,
  now: LiveStamps,
): "fresh" | "stale" | null {
  if (!entry) return null;
  const settled = entry.settled;
  if (entry.seen.version !== now.version) {
    if (!settled?.kept || !unchanged(settled.tables, entry.seen, now))
      return null;
    // Good for this version too: later checks start from here.
    entry.seen = now;
  }
  const age = Date.now() - entry.at;
  if (age < TTL_MS) return "fresh";
  if (
    !settled?.kept ||
    settled.signed ||
    age >= STALE_MS ||
    refreshing.getStore()
  )
    return null;
  return "stale";
}

type Computation<T> = { entry: Entry; result: Promise<T>; deps: Set<string> };

// Computes a view in its scope and makes the entry that will keep it. Its
// reads may be served from the answers kept for this project and reader
// (lib/projects/request-cache.ts).
function compute<T>(
  name: string,
  key: string,
  scope: ViewScope,
  read: (projectId: string) => Promise<T>,
): Computation<T> {
  const { result, deps } = collecting(() =>
    inView(scope, () => read(scope.projectId)),
  );
  const drop = (entry: Entry) => {
    if (entries.get(key) === entry) entries.delete(key);
  };
  const entry: Entry = {
    at: Date.now(),
    seen: scope.now,
    settled: null,
    value: Promise.resolve(result).then(
      async (value): Promise<Kept> => {
        if (!isPlain(value)) {
          uncacheable.add(name);
          drop(entry);
          console.warn(`byProjectVersion: ${name} is not plain data, not kept`);
          return { kept: false };
        }
        const list = [...deps];
        return {
          kept: true,
          value: structuredClone(value),
          deps: list,
          tables: await tablesOf(list),
          signed: holdsSignedLink(value),
        };
      },
      // A failure (redirect, notFound, error) is never kept.
      (): Kept => {
        drop(entry);
        return { kept: false };
      },
    ),
  };
  void entry.value.then((kept) => {
    entry.settled = kept;
  });
  return { entry, result, deps };
}

// Computes a view served past its time again once the response is sent (it
// would otherwise share the database with the page that waits): the new
// entry replaces the old one once kept, unless another took its place. It
// reads the session from the cookies as they were during the request: a
// Server Component may not read them any more then.
async function refresh<T>(
  name: string,
  key: string,
  stale: Entry,
  scope: ViewScope,
  read: (projectId: string) => Promise<T>,
) {
  if (stale.refreshing) return;
  stale.refreshing = true;
  let jar: Awaited<ReturnType<typeof requestCookies>>;
  try {
    jar = await requestCookies();
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const expires = (data?.claims.exp ?? 0) * 1000;
    if (expires - Date.now() < SESSION_MARGIN_MS) throw new Error("session");
  } catch {
    // No session to read with safely: computed again on next read.
    if (entries.get(key) === stale) entries.delete(key);
    return;
  }
  if (process.env.PERF_TRACE === "1")
    console.info(`[cache] ${name} served past its time, computed again`);
  let sent = () => {};
  const responded = new Promise<void>((resolve) => (sent = resolve));
  const task = responded.then(() =>
    apart(() =>
      withCookies(jar, () =>
        refreshing.run(true, () => {
          const started = Date.now();
          const { entry, result } = compute(name, key, scope, read);
          void result.catch(() => {});
          return entry.value.then((kept) => {
            if (entries.get(key) !== stale) return;
            if (kept.kept) remember(key, entry);
            else entries.delete(key);
            if (process.env.PERF_TRACE === "1")
              console.info(
                `[cache] ${name} computed again in the background, ${Date.now() - started} ms`,
              );
          });
        }),
      ),
    ),
  );
  try {
    // Keeps the server alive until it is done (Vercel).
    after(() => {
      sent();
      return task;
    });
  } catch {
    // Outside a request: computed right away.
    sent();
  }
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
    const scope: ViewScope = { projectId, now, reader };
    const hit = entries.get(key);
    const state = servable(hit, now);
    if (hit && state) {
      if (state === "stale") void refresh(name, key, hit, scope, read);
      const found = await hit.value;
      // Each request gets its own copy: nothing it changes reaches another.
      if (found.kept) {
        addDeps(found.deps);
        return structuredClone(found.value) as T;
      }
      return read(projectId);
    }

    traceMiss(name, hit, now);
    const { entry, result, deps } = compute(name, key, scope, read);
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
