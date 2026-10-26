import "server-only";

import { cache } from "react";

import { getAccess } from "@/lib/auth/dal";
import { todayInParis } from "@/lib/contracts/types";
import { createClient } from "@/lib/supabase/server";

// Cache of a project's computed views across requests (page loads audit,
// docs/ARCHITECTURE.md § 3 bis, « Cache des parcours »). A project's
// journeys and workflow states cost 65 to 250 requests; the same person
// asks for them again on every page of the project, every refresh and on
// the Accueil, while the project has not changed. They are kept here for
// the version they were read at:
// - project_live.version, bumped by a trigger on every table of the project
//   (20261026100201_project_live_everywhere.sql), read FIRST: data read
//   after it is at least as new, so an entry never holds an older state
//   than its version says;
// - the reader as the database knows them (the whole Access: account,
//   position, permissions), since RLS and the journeys depend on who reads;
// - the day in Paris (overdue steps), and at most TTL_MS old: what does not
//   bump the version (a name in the Réseau, a catalog file of a title held
//   by no project) and the signed links (15 min at least) stay short-lived.
// A reader without a version row (a project they may not see) is never
// served from here. A view that is not plain data (a function, a class
// instance) is never kept. Concurrent requests for the same entry (a
// hovered link's prefetch, then the click) share one computation.

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 300;

// `kept: false`: the computation failed or is not plain data; whoever waited
// on it computes on its own.
type Kept = { kept: true; value: unknown } | { kept: false };
type Entry = { at: number; value: Promise<Kept> };
const entries = new Map<string, Entry>();
// Views found not to be plain data: computed every time.
const uncacheable = new Set<string>();

/** The project's version for the reader, once per request; null when the
 * reader has no row (a project they may not see) or the read failed. */
export const projectVersion = cache(
  async (projectId: string): Promise<number | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_live")
      .select("version")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) {
      console.error("projectVersion:", error.message);
      return null;
    }
    return data?.version ?? null;
  },
);

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

function remember(key: string, value: Promise<Kept>) {
  entries.delete(key);
  entries.set(key, { at: Date.now(), value });
  // The oldest first in a Map: drop them beyond the cap.
  for (const old of entries.keys()) {
    if (entries.size <= MAX_ENTRIES) break;
    entries.delete(old);
  }
}

/**
 * `read` kept per project version and reader (see above). Wrap it in
 * React's `cache` as before: the page still reads it once per request.
 */
export function byProjectVersion<T>(
  name: string,
  read: (projectId: string) => Promise<T>,
): (projectId: string) => Promise<T> {
  return async (projectId) => {
    if (uncacheable.has(name)) return read(projectId);
    const [access, version] = await Promise.all([
      getAccess(),
      projectVersion(projectId),
    ]);
    if (version === null || access.state !== "approved") return read(projectId);

    const key = JSON.stringify([
      name,
      projectId,
      version,
      todayInParis(new Date()),
      access,
    ]);
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      const found = await hit.value;
      // Each request gets its own copy: nothing it changes reaches another.
      if (found.kept) return structuredClone(found.value) as T;
      return read(projectId);
    }

    const value = read(projectId);
    const kept = value.then(
      (result): Kept => {
        if (isPlain(result))
          return { kept: true, value: structuredClone(result) };
        uncacheable.add(name);
        entries.delete(key);
        console.warn(`byProjectVersion: ${name} is not plain data, not kept`);
        return { kept: false };
      },
      // A failure (redirect, notFound, error) is never kept.
      (): Kept => {
        entries.delete(key);
        return { kept: false };
      },
    );
    remember(key, kept);
    return value;
  };
}
