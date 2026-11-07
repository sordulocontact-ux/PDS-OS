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
  inView,
  type LiveStamps,
  providePageScope,
  requestsOf,
  type Tables,
  tablesOfDeps,
  unchanged,
  untracked,
  type ViewScope,
} from "@/lib/projects/live-deps";
import { ensureFunctionMap } from "@/lib/projects/function-map";
import { holdsSignedLink, isPlain } from "@/lib/projects/plain-data";
import {
  loadStoredView,
  readerHash,
  type StoredView,
  storeView,
} from "@/lib/projects/view-store";
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
// - fresh for TTL_MS on the same day in Paris (overdue steps): what is not a
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
// A night or a weekend: a view kept in the database (lib/projects/view-
// store.ts) is then served once, the morning after, and computed again
// right after the response (page loads audit of 07/11/2026). Only what is
// not a table of the project, and the steps overdue since, may show their
// state of the day before on that one page.
const STALE_MS = 72 * 60 * 60_000;
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
    ensureFunctionMap(),
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

// The tables `deps` stand for, once the functions' reads are known
// (lib/projects/function-map.ts).
async function tablesOf(deps: string[]): Promise<Tables> {
  await ensureFunctionMap();
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
  // Computed another day: its overdue steps may have changed since.
  const sameDay = todayInParis(new Date(entry.at)) === todayInParis(new Date());
  if (age < TTL_MS && sameDay) return "fresh";
  if (
    !settled?.kept ||
    settled.signed ||
    age >= STALE_MS ||
    refreshing.getStore()
  )
    return null;
  return "stale";
}

// An entry from a view kept in the database (lib/projects/view-store.ts).
function storedEntry(stored: StoredView): Entry {
  const settled: Kept = {
    kept: true,
    value: stored.value,
    deps: stored.deps,
    tables: stored.tables,
    signed: false,
  };
  return {
    at: stored.computedAt,
    seen: stored.seen,
    settled,
    value: Promise.resolve(settled),
  };
}

// What a computed entry gives the database to keep, once kept.
const toStore = (entry: Entry): Promise<StoredView | null> =>
  entry.value.then((kept) =>
    kept.kept && !kept.signed
      ? {
          computedAt: entry.at,
          seen: entry.seen,
          deps: kept.deps,
          tables: kept.tables,
          value: kept.value,
        }
      : null,
  );

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
  accountId: string | null,
  who: string,
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
            if (kept.kept) {
              remember(key, entry);
              if (accountId)
                storeView(
                  {
                    accountId,
                    view: name,
                    project: scope.projectId,
                    reader: readerHash(who),
                    stored: toStore(entry),
                  },
                  true,
                );
            } else entries.delete(key);
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
    // The functions' reads are known before the view's reads leave: its
    // answers can be served from the request cache from the first one.
    const [access, now] = await Promise.all([
      getAccess(),
      projectLive(projectId),
      ensureFunctionMap(),
    ]);
    if (now === null || access.state !== "approved") return read(projectId);

    // Who reads, and on which day (overdue steps).
    // The answers of the request cache are kept per day; a view is kept
    // whatever the day and served stale once on another day (servable).
    const reader = JSON.stringify([todayInParis(new Date()), access]);
    const who = JSON.stringify(access);
    const key = JSON.stringify([name, projectId, who]);
    const scope: ViewScope = { projectId, now, reader };
    const { accountId } = access;
    let hit = entries.get(key);
    let state = servable(hit, now);
    // Not in this instance's memory: kept in the database by an earlier
    // one (lib/projects/view-store.ts), served under the same rules.
    if (!state && accountId && !refreshing.getStore()) {
      const stored = await loadStoredView(name, projectId, readerHash(who));
      // Another request of this instance may have started it meanwhile.
      const current = entries.get(key);
      if (current && servable(current, now)) {
        hit = current;
        state = servable(current, now);
      } else if (stored) {
        const entry = storedEntry(stored);
        const storedState = servable(entry, now);
        if (storedState) {
          remember(key, entry);
          hit = entry;
          state = storedState;
          if (process.env.PERF_TRACE === "1")
            console.info(`[cache] ${name} served from the database`);
        }
      }
    }
    if (hit && state) {
      if (state === "stale")
        void refresh(name, key, hit, scope, read, accountId, who);
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
    if (accountId)
      storeView({
        accountId,
        view: name,
        project: projectId,
        reader: readerHash(who),
        stored: toStore(entry),
      });
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
