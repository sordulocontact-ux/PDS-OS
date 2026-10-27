import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import {
  type MergePlan,
  MERGED_ROWS,
  mergedUrl,
  mergePlan,
  rowsOf,
} from "@/lib/supabase/batch-plan";
import { sentFetch } from "@/lib/supabase/query-trace";

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
//   A count (`head`, `count=exact`) is merged the same way, each caller
//   counting its own rows;
// - the very same read (a list of contacts, `workflow_is_launched` for the
//   same project) leaves once and its answer is shared, also with whoever
//   asks it again later in the scope (a scope is one moment of reading: no
//   write runs inside it, so the answer still holds). This is what React's
//   `cache` cannot do in a Server Action (lib/journey/outcome.ts).
// At most MAX_IN_FLIGHT requests at once: what waits keeps merging.
// Anything else (a write, a page of rows) leaves as it is. Off outside
// withQueryBatching.

// How long a read waits for the same read of other projects (ms): their
// loaders run in step, so their reads leave in the same instant.
const WINDOW_MS = 3;
// Requests in flight at most: the others wait in their group, where the
// same read of more projects keeps joining them (a busy database merges
// more instead of queueing more).
const MAX_IN_FLIGHT = 10;
// Ids per merged condition at most (the URL stays short).
const MAX_IDS = 80;

type Member = {
  url: string;
  init: RequestInit | undefined;
  plan: MergePlan | null;
  resolve: (response: Response) => void;
  reject: (reason: unknown) => void;
};
type Group = { members: Member[]; merge: boolean; count: boolean };

// A copy of an answer for another caller (no body on 204, 205, 304).
const copyOf = (body: string, response: Response) =>
  new Response([204, 205, 304].includes(response.status) ? null : body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

const json = (rows: unknown) =>
  new Response(JSON.stringify(rows), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// The answer to `count=exact` without rows (`head`), as PostgREST gives it.
const counted = (n: number) =>
  new Response(null, {
    status: 200,
    headers: { "content-range": n === 0 ? "*/0" : `0-${n - 1}/${n}` },
  });

// An answer kept for the rest of the scope.
type Kept = { body: string; response: Response };

class Batcher {
  private groups = new Map<string, Group>();
  private ready: string[] = [];
  private inFlight = 0;
  // Reads already answered in this scope, by their exact request.
  private answered = new Map<string, Promise<Kept>>();

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const key = this.keyOf(input, init);
    if (!key) return sentFetch(input, init);
    let kept = this.answered.get(key.exact);
    if (!kept) {
      kept = this.queue(input, init, key).then(async (response) => ({
        body: await response.text(),
        response,
      }));
      this.answered.set(key.exact, kept);
      // A failed read is asked again by whoever needs it next.
      kept.then(
        ({ response }) => {
          if (!response.ok) this.answered.delete(key.exact);
        },
        () => this.answered.delete(key.exact),
      );
    }
    return kept.then(({ body, response }) => copyOf(body, response));
  }

  private queue(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    key: { key: string; plan: MergePlan | null; count: boolean },
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const member: Member = {
        url: String(input),
        init,
        plan: key.plan,
        resolve,
        reject,
      };
      const open = this.groups.get(key.key);
      if (open) return void open.members.push(member);
      this.groups.set(key.key, {
        members: [member],
        merge: key.plan !== null,
        count: key.count,
      });
      setTimeout(() => {
        this.ready.push(key.key);
        this.pump();
      }, WINDOW_MS);
    });
  }

  // Sends the groups whose window is over, MAX_IN_FLIGHT at a time; a group
  // keeps collecting members until it leaves.
  private pump() {
    while (this.inFlight < MAX_IN_FLIGHT && this.ready.length > 0) {
      const key = this.ready.shift() as string;
      const group = this.groups.get(key);
      this.groups.delete(key);
      if (!group) continue;
      this.inFlight++;
      void (group.merge ? this.merge(group) : this.share(group.members))
        .catch((reason) => {
          for (const member of group.members) member.reject(reason);
        })
        .finally(() => {
          this.inFlight--;
          this.pump();
        });
    }
  }

  // How a request is grouped: a read (or a count) to merge by ids, a read
  // or an RPC to share when identical; null for anything else.
  private keyOf(input: RequestInfo | URL, init?: RequestInit) {
    if (input instanceof Request) return null;
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const headerKey = JSON.stringify([...headers.entries()].sort());
    const rpc = url.pathname.includes("/rest/v1/rpc/");
    const exact = JSON.stringify([url.href, method, init?.body, headerKey]);
    const share = { key: exact, exact, plan: null, count: false };
    if (method === "POST" && rpc) return share;
    if (!url.pathname.includes("/rest/v1/") || rpc) return null;
    const accept = headers.get("accept");
    const prefer = headers.get("prefer");
    const count = method === "HEAD" && prefer === "count=exact";
    if (method !== "GET" && !count) return null;
    const plain =
      (count || ((!accept || accept === "application/json") && !prefer)) &&
      !headers.has("range");
    const plan = plain ? mergePlan(url, headerKey, count) : null;
    return plan ? { key: plan.key, exact, plan, count } : share;
  }

  // Identical requests: one leaves, each caller gets its own copy.
  private async share(members: Member[]) {
    const [first] = members;
    const response = await sentFetch(first.url, first.init);
    if (members.length === 1) return first.resolve(response);
    const body = await response.text();
    for (const member of members) member.resolve(copyOf(body, response));
  }

  private async alone(members: Member[]) {
    await Promise.all(
      members.map((m) => sentFetch(m.url, m.init).then(m.resolve, m.reject)),
    );
  }

  private async merge({ members, count }: Group) {
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
    const limited = count || plans[0].limit !== null;
    const { url, added } = mergedUrl(
      new URL(members[0].url),
      union,
      limited,
      count,
    );
    const headers = new Headers(members[0].init?.headers);
    headers.delete("prefer");
    const response = await sentFetch(url, { method: "GET", headers });
    const body = await response.text();
    if (!response.ok) {
      for (const member of members) member.resolve(copyOf(body, response));
      return;
    }
    const rows = JSON.parse(body) as Record<string, unknown>[];
    const parts = plans.map((plan) =>
      rowsOf(rows, plan.ids, added, count ? null : plan.limit),
    );
    // A row that cannot be placed, or a merged answer that may be cut:
    // each read leaves on its own.
    if (
      parts.some((p) => p === null) ||
      (limited && rows.length >= MERGED_ROWS)
    )
      return this.alone(members);
    members.forEach((member, i) => {
      const part = parts[i] as Record<string, unknown>[];
      member.resolve(count ? counted(part.length) : json(part));
    });
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
  return batcher ? batcher.fetch(input, init) : sentFetch(input, init);
};
