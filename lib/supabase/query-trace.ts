import "server-only";

import { headers } from "next/headers";
import { after } from "next/server";
import { cache } from "react";

import { getServerEnv } from "@/lib/env";

// Measure of a page's database requests (page loads audit, docs/
// ARCHITECTURE.md § 3 bis), on with PERF_TRACE=1. After the response, one
// line per render in the server logs:
//   [perf] /app/projects/…/legal rsc · 143 req · 1840 ms · depth 7 · 37 in flight max
//     slowest: rpc/workflow_is_launched 620 ms, legal_clearances 410 ms…
// « depth » is the longest chain of requests where each starts after the
// previous one ended: the round trips a render waits for one after another.
// Off, the fetch is passed through untouched.

type Call = { name: string; start: number; end: number };

type Trace = {
  calls: Call[];
  path: string | null;
  kind: string;
  logged: boolean;
  labelled: Promise<void> | null;
};

let enabled: boolean | null = null;
function isEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = getServerEnv().PERF_TRACE === "1";
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

// One trace per request while rendering; a Server Action or a route
// handler gets one per call (React's cache does not hold there).
const traceOf = cache((): Trace => ({
  calls: [],
  path: null,
  kind: "page",
  logged: false,
  labelled: null,
}));

// `rpc/workflow_is_launched`, `legal_clearances`, `auth/user`…
function nameOf(input: RequestInfo | URL): string {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const path = new URL(raw).pathname;
  return path.replace(/^\/rest\/v1\//, "").replace(/^\/(\w+)\/v1\//, "$1/");
}

async function label(trace: Trace) {
  try {
    const list = await headers();
    trace.path = list.get("x-pds-path");
    trace.kind =
      list.get("next-router-prefetch") === "1"
        ? "prefetch"
        : list.get("rsc") === "1"
          ? "rsc"
          : list.get("next-action")
            ? "action"
            : "page";
  } catch {
    // Outside a request (build, cron without headers): unnamed.
  }
}

// The longest chain of requests that ran one after another.
function depthOf(calls: Call[]): number {
  const sorted = [...calls].sort((a, b) => a.start - b.start);
  const depth: number[] = [];
  let max = 0;
  sorted.forEach((call, i) => {
    let before = 0;
    for (let j = 0; j < i; j++) {
      if (sorted[j].end <= call.start) before = Math.max(before, depth[j]);
    }
    depth[i] = before + 1;
    max = Math.max(max, depth[i]);
  });
  return max;
}

function maxInFlight(calls: Call[]): number {
  const events = calls.flatMap((c) => [
    { at: c.start, step: 1 },
    { at: c.end, step: -1 },
  ]);
  events.sort((a, b) => a.at - b.at || a.step - b.step);
  let current = 0;
  let max = 0;
  for (const event of events) {
    current += event.step;
    max = Math.max(max, current);
  }
  return max;
}

function report(trace: Trace) {
  const { calls } = trace;
  if (calls.length === 0) return;
  const first = Math.min(...calls.map((c) => c.start));
  const last = Math.max(...calls.map((c) => c.end));
  const slowest = [...calls]
    .sort((a, b) => b.end - b.start - (a.end - a.start))
    .slice(0, 5)
    .map((c) => `${c.name} ${Math.round(c.end - c.start)} ms`)
    .join(", ");
  console.info(
    `[perf] ${trace.path ?? "?"} ${trace.kind} · ${calls.length} req · ` +
      `${Math.round(last - first)} ms · depth ${depthOf(calls)} · ` +
      `${maxInFlight(calls)} in flight max\n  slowest: ${slowest}`,
  );
}

/** The client's fetch, measured when PERF_TRACE=1. */
export function tracingFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    if (!isEnabled()) return inner(input, init);
    const trace = traceOf();
    if (!trace.logged) {
      trace.logged = true;
      trace.labelled = label(trace);
      try {
        after(async () => {
          await trace.labelled;
          report(trace);
        });
      } catch {
        // Outside a request scope: nothing to report after.
      }
    }
    const start = performance.now();
    try {
      return await inner(input, init);
    } finally {
      trace.calls.push({ name: nameOf(input), start, end: performance.now() });
    }
  };
}
