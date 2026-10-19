// How a read of the database (a PostgREST URL) can share one request with
// the same read of other projects (lib/supabase/batch.ts). Pure functions.

const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const ID_VALUE = new RegExp(
  `^(?:eq\\.(${UUID})|in\\.\\((${UUID}(?:,${UUID})*)\\))$`,
);
// PostgREST parameters that are never a column's condition.
const RESERVED = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "or",
  "and",
  "not",
  "on_conflict",
  "columns",
]);
// Rows a merged read with a `limit` may return; beyond, each read leaves on
// its own (the merged answer might be cut).
export const MERGED_ROWS = 1000;

/** A read that differs from others only by its id conditions. */
export type MergePlan = {
  // Same key = same read but for the ids.
  key: string;
  // Column (or embedded path « calls.project_id ») → the ids asked.
  ids: Map<string, Set<string>>;
  // The read's own `limit`, if any.
  limit: number | null;
};

/** The select's top-level items (« id, call:calls!inner(id, …) »). */
export function topLevel(select: string | null): string[] {
  if (!select) return ["*"];
  const tokens: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of select) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      tokens.push(current.trim());
      current = "";
    } else current += ch;
  }
  tokens.push(current.trim());
  return tokens;
}

// A condition on an embedded resource filters its parent rows only through
// an inner join: then each parent row carries the value, and the rows of
// one read are found back in the merged answer.
function innerPath(path: string, select: string) {
  const segments = path.split(".").slice(0, -1);
  return segments.every((s) =>
    new RegExp(`(^|[,(:])${s}!inner\\(`).test(select.replace(/\s/g, "")),
  );
}

/** Null when the read must not be merged: a page (`offset`), a long
 * `limit`, or no id condition. */
export function mergePlan(url: URL, headerKey: string): MergePlan | null {
  if (url.searchParams.has("offset")) return null;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === null ? null : Number(limitParam);
  if (limit !== null && !(limit > 0 && limit <= MERGED_ROWS)) return null;
  const select = url.searchParams.get("select") ?? "*";
  const ids = new Map<string, Set<string>>();
  const rest: [string, string][] = [];
  for (const [name, value] of url.searchParams) {
    const match =
      !RESERVED.has(name) && !ids.has(name) ? ID_VALUE.exec(value) : null;
    if (match && (!name.includes(".") || innerPath(name, select)))
      ids.set(name, new Set((match[1] ?? match[2]).toLowerCase().split(",")));
    else rest.push([name, value]);
  }
  if (ids.size === 0) return null;
  // An alias named like an id column would hide it in the rows.
  const tokens = topLevel(select);
  if ([...ids.keys()].some((c) => tokens.some((t) => t.startsWith(`${c}:`))))
    return null;
  const key = JSON.stringify([
    url.origin + url.pathname,
    rest,
    [...ids.keys()],
    headerKey,
  ]);
  return { key, ids, limit };
}

/** The merged URL: every id condition as `in.(…)` of all the ids, the id
 * columns added to the select when missing (`added`, removed afterwards). */
export function mergedUrl(
  base: URL,
  union: Map<string, Set<string>>,
  limited: boolean,
): { url: URL; added: string[] } {
  const url = new URL(base);
  for (const [column, values] of union)
    url.searchParams.set(column, `in.(${[...values].join(",")})`);
  if (limited) url.searchParams.set("limit", String(MERGED_ROWS));
  const tokens = topLevel(url.searchParams.get("select"));
  const added = tokens.includes("*")
    ? []
    : [...union.keys()].filter((c) => !c.includes(".") && !tokens.includes(c));
  if (added.length > 0)
    url.searchParams.set("select", [...tokens, ...added].join(","));
  return { url, added };
}

/** The value at « calls.project_id » in a row; undefined when the path
 * crosses a list or is missing (the rows cannot be split back). */
export function valueAt(row: unknown, path: string): string | undefined {
  let value: unknown = row;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

/** One read's rows out of the merged answer, in its order; null when a row
 * cannot be placed (then each read leaves on its own). */
export function rowsOf(
  rows: Record<string, unknown>[],
  ids: Map<string, Set<string>>,
  added: string[],
  limit: number | null,
): Record<string, unknown>[] | null {
  const mine: Record<string, unknown>[] = [];
  for (const row of rows) {
    let keep = true;
    for (const [column, values] of ids) {
      const value = valueAt(row, column);
      if (value === undefined) return null;
      if (!values.has(value)) keep = false;
    }
    if (!keep) continue;
    if (added.length === 0) mine.push(row);
    else {
      const copy = { ...row };
      for (const column of added) delete copy[column];
      mine.push(copy);
    }
  }
  return limit === null ? mine : mine.slice(0, limit);
}
