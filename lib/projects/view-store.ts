import "server-only";

import { createHash } from "node:crypto";

import { after } from "next/server";
import { cache } from "react";

import {
  type LiveStamps,
  outsideViews,
  type Tables,
} from "@/lib/projects/live-deps";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  createClient,
  requestCookies,
  withCookies,
} from "@/lib/supabase/server";

// A project's computed views kept in the database too (page loads audit of
// 07/11/2026, docs/ARCHITECTURE.md § 3 bis, « Cache des vues en base »,
// 20261107230201_project_view_cache.sql). The memory cache of
// lib/projects/version-cache.ts lives in one server instance: every new one
// (Vercel starts them all the time, a restarted `pnpm dev`) computed every
// project again, 1 688 reads for the Accueil. A view computed for a reader is
// written here once the response is sent; a new instance reads the rows of
// all the views and projects a page asks in one request, and
// version-cache.ts serves them under its own rules (stamps read first, none
// of the view's tables changed). Each reader reads and writes only their own
// rows (RLS). Only JSON data is kept (a Date, a Map or a Set would not come
// back the same).

/** A kept view as the database gives it back. */
export type StoredView = {
  computedAt: number;
  seen: LiveStamps;
  deps: string[];
  tables: Tables;
  value: unknown;
};

type Row = {
  account_id: string;
  view: string;
  project: string;
  reader: string;
  computed_at: string;
  seen: LiveStamps;
  deps: string[];
  tables: Tables;
  value: unknown;
};

// Above this size a view is not written (one row per reader and project).
const MAX_BYTES = 1024 * 1024;
// Ids per request at most (the URL stays short).
const MAX_PROJECTS = 60;
// How long reads wait for the others of the same render to go together.
const WINDOW_MS = 2;

/** Who reads, as the rows know them: a hash of the reader's key. */
export const readerHash = (reader: string) =>
  createHash("sha256").update(reader).digest("hex");

// JSON gives it back as it is: no Date, Map, Set, NaN or cycle.
function jsonSafe(value: unknown, depth = 0): boolean {
  if (depth > 200) return false;
  if (value === null) return true;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "undefined":
      return depth > 0;
    case "object":
      if (Array.isArray(value))
        return value.every(
          (item) => item !== undefined && jsonSafe(item, depth + 1),
        );
      if (Object.getPrototypeOf(value) !== Object.prototype) return false;
      return Object.values(value).every((item) => jsonSafe(item, depth + 1));
    default:
      return false;
  }
}

type Waiting = {
  view: string;
  project: string;
  resolve: (row: StoredView | null, reader: string | null) => void;
};

// The reads of one render, sent together (one request for every view and
// project asked in the same instant: the Accueil's 13 projects at once).
class Batch {
  private waiting: Waiting[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private client: ReturnType<typeof createClient> | null = null;

  load(view: string, project: string, reader: string) {
    // The client is made now, while the request's cookies can be read.
    this.client ??= createClient();
    return new Promise<StoredView | null>((resolve) => {
      this.waiting.push({
        view,
        project,
        resolve: (row, rowReader) =>
          resolve(row && rowReader === reader ? row : null),
      });
      this.timer ??= setTimeout(() => void this.flush(), WINDOW_MS);
    });
  }

  private async flush() {
    const waiting = this.waiting;
    const client = this.client;
    this.waiting = [];
    this.timer = null;
    this.client = null;
    if (!client) return;
    const found = new Map<string, Row>();
    try {
      const supabase = await client;
      const views = [...new Set(waiting.map((w) => w.view))];
      const projects = [...new Set(waiting.map((w) => w.project))];
      for (let i = 0; i < projects.length; i += MAX_PROJECTS) {
        const { data, error } = await outsideViews(() =>
          supabase
            .from("project_view_cache")
            .select(
              "account_id, view, project, reader, computed_at, seen, deps, tables, value",
            )
            .in("view", views)
            .in("project", projects.slice(i, i + MAX_PROJECTS)),
        );
        if (error) throw new Error(error.message);
        for (const row of (data ?? []) as Row[])
          found.set(`${row.view} ${row.project}`, row);
      }
    } catch (error) {
      console.error("project_view_cache:", error);
    }
    for (const w of waiting) {
      const row = found.get(`${w.view} ${w.project}`);
      w.resolve(
        row
          ? {
              computedAt: Date.parse(row.computed_at),
              seen: row.seen,
              deps: row.deps,
              tables: row.tables,
              value: row.value,
            }
          : null,
        row?.reader ?? null,
      );
    }
  }
}

const batchOf = cache(() => new Batch());

/** The view kept for this reader and project, or null. */
export function loadStoredView(
  view: string,
  project: string,
  reader: string,
): Promise<StoredView | null> {
  return batchOf().load(view, project, reader);
}

type Pending = {
  accountId: string;
  view: string;
  project: string;
  reader: string;
  stored: Promise<StoredView | null>;
};

// Writes the views kept, in a few requests (with the session given).
type Insert = Database["public"]["Tables"]["project_view_cache"]["Insert"];

async function write(rows: Pending[]) {
  const settled: Insert[] = [];
  for (const row of rows) {
    const stored = await row.stored.catch(() => null);
    // A view of nothing (`null`) reaches the column as SQL NULL, refused
    // (`value` is not null): it would fail its whole batch (Maël's log of
    // 26/11/2026). It is computed again instead.
    if (!stored || stored.value === null || !jsonSafe(stored.value)) continue;
    const size = JSON.stringify(stored.value).length;
    if (size > MAX_BYTES) continue;
    settled.push({
      account_id: row.accountId,
      view: row.view,
      project: row.project,
      reader: row.reader,
      computed_at: new Date(stored.computedAt).toISOString(),
      seen: stored.seen as unknown as Json,
      deps: stored.deps,
      tables: stored.tables as unknown as Json,
      // JSON data only (jsonSafe above).
      value: stored.value as Json,
    });
  }
  if (!settled.length) return;
  const supabase = await createClient();
  for (let i = 0; i < settled.length; i += 25) {
    const { error } = await outsideViews(() =>
      supabase.from("project_view_cache").upsert(settled.slice(i, i + 25), {
        onConflict: "account_id,view,project",
      }),
    );
    // One batch refused never keeps the next ones from being written.
    if (error) console.error("project_view_cache:", error.message);
  }
}

// The views to write once this request's response is sent.
const pendingOf = cache(() => ({
  rows: [] as Pending[],
  scheduled: false,
}));

/**
 * Writes a view once it is kept, after the response (one round of writes
 * per request, with the request's session). `inBackground`: called from a
 * view computed again after the response, where the session is already
 * given: written right away.
 */
export function storeView(row: Pending, inBackground = false) {
  if (inBackground) {
    void write([row]).catch((error: unknown) =>
      console.error("project_view_cache:", error),
    );
    return;
  }
  const pending = pendingOf();
  pending.rows.push(row);
  if (pending.scheduled) return;
  pending.scheduled = true;
  const jar = requestCookies();
  try {
    after(async () => {
      try {
        const list = await jar;
        await withCookies(list, () => write(pending.rows));
      } catch (error) {
        console.error("project_view_cache:", error);
      }
    });
  } catch {
    // Outside a request: nothing is written.
  }
}
