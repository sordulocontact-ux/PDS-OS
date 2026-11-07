import "server-only";

import {
  functionReads,
  setFunctionsKnown,
  setViewTables,
  untracked,
} from "@/lib/projects/live-deps";
import { createClient } from "@/lib/supabase/server";

// What each database function reads, for the caches of a project's views
// and answers (page loads audit of 07/11/2026, docs/ARCHITECTURE.md § 3 bis,
// « Cache par table »). The database says it for every function at once
// (live_function_map, 20261107230101): the tables and views each one names,
// the functions it calls, whether it is read-only, and the tables behind
// each view. The calls are followed here. Read once per server instance,
// then checked every RECHECK_MS with its signature (one small read: the map
// is sent again only after a migration changed the functions). Before,
// live_rpc_reads scanned every function's body at each call (6 to 12 s on a
// new connection) and nothing was served from the cache meanwhile.

const RECHECK_MS = 5 * 60_000;

type FunctionEntry = { t: string[]; c: string[]; ro: boolean };
type FunctionMap = {
  fns: Record<string, FunctionEntry>;
  views: Record<string, string[]>;
};

let signature: string | null = null;
let checkedAt = 0;
let loading: Promise<void> | null = null;

// The tables a function reads, itself and through the functions it calls,
// a view standing for its tables.
function closure(map: FunctionMap, name: string): string[] {
  const tables = new Set<string>();
  const seen = new Set<string>();
  const stack = [name];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    const entry = map.fns[current];
    if (!entry) continue;
    for (const table of entry.t)
      for (const base of map.views[table] ?? [table]) tables.add(base);
    for (const callee of entry.c) if (!seen.has(callee)) stack.push(callee);
  }
  return [...tables].sort();
}

function install(map: FunctionMap) {
  functionReads.clear();
  for (const [name, entry] of Object.entries(map.fns))
    functionReads.set(name, { tables: closure(map, name), readOnly: entry.ro });
  setViewTables(map.views);
  setFunctionsKnown(true);
}

async function load() {
  const supabase = await createClient();
  const { data, error } = await untracked(() =>
    supabase.rpc("live_function_map", { p_known: signature ?? undefined }),
  );
  if (error || !data) {
    if (error) console.error("live_function_map:", error.message);
    return;
  }
  const answer = data as { signature: string; map?: FunctionMap };
  if (answer.map) install(answer.map);
  signature = answer.signature;
  checkedAt = Date.now();
}

/** Makes sure the functions' reads are known (see above). One load at a
 * time per server instance; a failure leaves them unknown (nothing is then
 * kept for a view that calls a function) and is tried again next time. */
export function ensureFunctionMap(): Promise<void> {
  if (signature !== null && Date.now() - checkedAt < RECHECK_MS)
    return Promise.resolve();
  loading ??= load()
    .catch((error: unknown) => {
      console.error("live_function_map:", error);
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}
