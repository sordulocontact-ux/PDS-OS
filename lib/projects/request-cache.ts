import "server-only";

import {
  currentView,
  functionReads,
  type LiveStamps,
  type Tables,
  tablesOfDeps,
  unchanged,
} from "@/lib/projects/live-deps";

// Answers kept per read (page loads audit of 28/10/2026, docs/
// ARCHITECTURE.md § 3 bis, « Cache par table »). A view of a project is
// computed again when one of the tables it read changed
// (lib/projects/version-cache.ts); most of its reads did not: the Juridique
// computed again after a constraint of the Cadrage re-sent its 36 requests
// for one that changed. Each answer to a read sent while a view is computed
// is kept here with the tables it read, and served again to the same
// reader, for the same project, while none of them changed in the project
// (project_live.tables): only the reads of what changed reach the database.
//
// Kept: reads only, a table (and the tables its `select` embeds) or a
// function the database says is read-only (STABLE, live_rpc_reads), never
// a write; an answer the server reads as is (2xx). Keyed by the reader
// (account, position, permissions, day), the project and the exact request
// (URL, body, the headers that change the answer). At most TTL_MS old, as
// the views: what is not a table of a project stays short-lived. Same
// guarantees as the views (lib/projects/version-cache.ts), read for read.

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 5000;
// An answer above this size is not kept (a page of rows, a file).
const MAX_BODY = 512 * 1024;

type Stored = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
};
type Entry = {
  at: number;
  seen: LiveStamps;
  tables: Tables;
  answer: Promise<Stored | null>;
};
const entries = new Map<string, Entry>();

const EMBED = /([a-z_][a-z0-9_]*)(?:![a-z0-9_]+)?\(/g;

function headerOf(init: RequestInit | undefined, name: string): string {
  const headers = init?.headers;
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get(name) ?? "";
  if (Array.isArray(headers))
    return headers.find(([key]) => key.toLowerCase() === name)?.[1] ?? "";
  const record = headers as Record<string, string>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === name);
  return key ? record[key] : "";
}

// What a request reads, or null when it may not be kept.
function readsOf(url: URL, method: string): string[] | null {
  const path = url.pathname.match(/\/rest\/v1\/(rpc\/)?([a-z_][a-z0-9_]*)$/);
  if (!path) return null;
  if (path[1]) {
    // A function: only one the database says cannot write.
    if (functionReads.get(path[2])?.readOnly !== true) return null;
    return method === "GET" || method === "POST" ? [`r:${path[2]}`] : null;
  }
  if (method !== "GET" && method !== "HEAD") return null;
  const deps = [`t:${path[2]}`];
  for (const [, name] of (url.searchParams.get("select") ?? "").matchAll(EMBED))
    deps.push(`t:${name}`);
  return deps;
}

const answerOf = (stored: Stored) =>
  new Response(stored.status === 204 ? null : stored.body, {
    status: stored.status,
    statusText: stored.statusText,
    headers: stored.headers,
  });

function remember(key: string, entry: Entry) {
  entries.delete(key);
  entries.set(key, entry);
  for (const old of entries.keys()) {
    if (entries.size <= MAX_ENTRIES) break;
    entries.delete(old);
  }
}

/** The server client's fetch, serving a view's reads from the kept answers. */
export function cachingFetch(next: typeof fetch): typeof fetch {
  return async (input, init) => {
    const view = currentView();
    if (!view || typeof input !== "string") return next(input, init);
    const method = (init?.method ?? "GET").toUpperCase();
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      return next(input, init);
    }
    const deps = readsOf(url, method);
    const tables = deps && tablesOfDeps(deps);
    if (!tables) return next(input, init);
    const body = typeof init?.body === "string" ? init.body : "";
    if (init?.body && !body) return next(input, init);

    const key = JSON.stringify([
      view.reader,
      view.projectId,
      method,
      input,
      body,
      headerOf(init, "accept"),
      headerOf(init, "prefer"),
      headerOf(init, "range"),
    ]);
    const hit = entries.get(key);
    if (
      hit &&
      Date.now() - hit.at < TTL_MS &&
      unchanged(hit.tables, hit.seen, view.now)
    ) {
      const stored = await hit.answer;
      if (stored) {
        if (view.now.version > hit.seen.version) hit.seen = view.now;
        return answerOf(stored);
      }
    }

    const response = next(input, init);
    const entry: Entry = {
      at: Date.now(),
      seen: view.now,
      tables,
      answer: response.then(
        async (res) => {
          if (res.status < 200 || res.status >= 300) return null;
          const text = await res.clone().text();
          if (text.length > MAX_BODY) return null;
          return {
            status: res.status,
            statusText: res.statusText,
            headers: [...res.headers.entries()],
            body: text,
          };
        },
        () => null,
      ),
    };
    remember(key, entry);
    void entry.answer.then((stored) => {
      if (!stored && entries.get(key) === entry) entries.delete(key);
    });
    return response;
  };
}
