import "server-only";

// Requests to Supabase in flight at most, per server process (page loads
// audit of 07/11/2026, docs/ARCHITECTURE.md § 3 bis, « Concurrence bornée »).
// A render used to send everything at once: opening the Projects list sent
// ~1 475 requests in 12 s, up to 289 a second. Locally, Kong (512
// connections) dropped some and the pages failed with « fetch failed »; on
// the pre-production database, 137 to 1 118 requests waited together for
// ~10 PostgREST connections, each one-row read taking 0.8 to 129 s. PostgREST
// serves ~10 at a time anyway: beyond that, a request only waits longer and
// costs a connection. The rest wait here, in order.
const MAX_IN_FLIGHT = 16;

let inFlight = 0;
const waiting: Array<() => void> = [];

function release() {
  inFlight -= 1;
  const next = waiting.shift();
  if (next) next();
}

// Resolves when a slot is free; rejects if the request is aborted while it
// waits (it then never takes a slot).
function acquire(signal: AbortSignal | null | undefined): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const take = () => {
      signal?.removeEventListener("abort", onAbort);
      inFlight += 1;
      resolve();
    };
    const onAbort = () => {
      const at = waiting.indexOf(take);
      if (at >= 0) waiting.splice(at, 1);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    waiting.push(take);
  });
}

/** `inner`, with at most MAX_IN_FLIGHT of its requests in flight at once. A
 * slot is held until the response's headers arrive (supabase-js reads the
 * small body right after). */
export function gated(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    await acquire(init?.signal);
    try {
      return await inner(input, init);
    } finally {
      release();
    }
  };
}
