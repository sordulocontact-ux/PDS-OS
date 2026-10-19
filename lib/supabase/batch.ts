import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import {
  type MergePlan,
  MERGED_ROWS,
  mergedUrl,
  mergePlan,
  rowsOf,
} from "@/lib/supabase/batch-plan";

// Read batching for the views that read every project at once (lib/work/
// journeys.ts, docs/ARCHITECTURE.md § 3 bis). Each project runs the very
// same journey loaders as its own pages (one source of truth, nothing
// re-written); what they send to the database in the same instant leaves
// as fewer requests:
// - the same read for other ids (`project_id=eq.A`, `master_id=in.(a,b)`)
//   leaves once (`project_id=in.(A,B…)`), and each caller receives back the
//   rows of its own ids, in order (lib/supabase/batch-plan.ts). The merged
//   read asks a superset under the same session (RLS filters each row the
//   same way): a caller gets exactly what it would have got alone;
// - the very same read (a list of contacts, `workflow_is_launched` for the
//   same project) leaves once and its answer is shared.
// Anything else (a write, a page of rows) leaves as it is. Off outside
// withQueryBatching.

// How long a read waits for the same read of other projects (ms): their
// loaders run in step, so their reads leave in the same instant.
const WINDOW_MS = 2;
// Ids per merged condition at most (the URL stays short).
const MAX_IDS = 80;

type Member = {
  url: string;
  init: RequestInit | undefined;
  plan: MergePlan | null;
  resolve: (response: Response) => void;
  reject: (reason: unknown) => void;
};

// A copy of an answer for another caller (no body on 204, 205, 304).
const copyOf = (body: string, response: Response) =>
  new Response([204, 205, 304].includes(response.status) ? null : body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

class Batcher {
  private groups = new Map<string, Member[]>();

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const key = this.keyOf(input, init);
    if (!key) return fetch(input, init);
    return new Promise<Response>((resolve, reject) => {
      const url = String(input);
      const member: Member = {
        url,
        init,
        plan: key.plan,
        resolve,
        reject,
      };
      const group = this.groups.get(key.key);
      if (group) return void group.push(member);
      this.groups.set(key.key, [member]);
      setTimeout(() => {
        const members = this.groups.get(key.key) ?? [member];
        this.groups.delete(key.key);
        void (key.plan ? this.merge(members) : this.share(members));
      }, WINDOW_MS);
    });
  }

  // How a request is grouped: a read to merge by ids, a read or an RPC to
  // share when identical; null for anything else.
  private keyOf(input: RequestInfo | URL, init?: RequestInit) {
    if (input instanceof Request) return null;
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const headerKey = JSON.stringify([...headers.entries()].sort());
    const rpc = url.pathname.includes("/rest/v1/rpc/");
    if (method === "POST" && rpc)
      return {
        key: JSON.stringify([url.href, init?.body, headerKey]),
        plan: null,
      };
    if (method !== "GET" || !url.pathname.includes("/rest/v1/")) return null;
    const accept = headers.get("accept");
    const plain =
      !rpc &&
      (!accept || accept === "application/json") &&
      !headers.has("prefer") &&
      !headers.has("range");
    const plan = plain ? mergePlan(url, headerKey) : null;
    return plan
      ? { key: plan.key, plan }
      : { key: JSON.stringify([url.href, headerKey]), plan: null };
  }

  // Identical requests: one leaves, each caller gets its own copy.
  private async share(members: Member[]) {
    const [first] = members;
    try {
      const response = await fetch(first.url, first.init);
      if (members.length === 1) return first.resolve(response);
      const body = await response.text();
      for (const member of members) member.resolve(copyOf(body, response));
    } catch (reason) {
      for (const member of members) member.reject(reason);
    }
  }

  private alone(members: Member[]) {
    for (const member of members)
      fetch(member.url, member.init).then(member.resolve, member.reject);
  }

  private async merge(members: Member[]) {
    const plans = members.map((m) => m.plan as MergePlan);
    const union = new Map<string, Set<string>>();
    for (const plan of plans)
      for (const [column, values] of plan.ids) {
        const all = union.get(column) ?? new Set<string>();
        for (const value of values) all.add(value);
        union.set(column, all);
      }
    if (
      members.length === 1 ||
      [...union.values()].some((s) => s.size > MAX_IDS)
    )
      return this.alone(members);
    const limited = plans[0].limit !== null;
    const { url, added } = mergedUrl(new URL(members[0].url), union, limited);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: members[0].init?.headers,
      });
      const body = await response.text();
      if (!response.ok) {
        for (const member of members) member.resolve(copyOf(body, response));
        return;
      }
      const rows = JSON.parse(body) as Record<string, unknown>[];
      const parts = plans.map((plan) =>
        rowsOf(rows, plan.ids, added, plan.limit),
      );
      // A row that cannot be placed, or a merged page that may be cut:
      // each read leaves on its own.
      if (
        parts.some((p) => p === null) ||
        (limited && rows.length >= MERGED_ROWS)
      )
        return this.alone(members);
      members.forEach((member, i) =>
        member.resolve(
          new Response(JSON.stringify(parts[i]), {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          }),
        ),
      );
    } catch (reason) {
      for (const member of members) member.reject(reason);
    }
  }
}

const scope = new AsyncLocalStorage<Batcher>();

/** Runs `fn` with its reads batched (see above): for a fan-out over many
 * projects only. */
export function withQueryBatching<T>(fn: () => Promise<T>): Promise<T> {
  return scope.run(new Batcher(), fn);
}

/** The server client's fetch: batched inside withQueryBatching, plain
 * everywhere else. */
export const batchingFetch: typeof fetch = (input, init) => {
  const batcher = scope.getStore();
  return batcher ? batcher.fetch(input, init) : fetch(input, init);
};
