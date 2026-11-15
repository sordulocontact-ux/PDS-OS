"use client";

import { useEffect, useState } from "react";

import {
  readFinancePulse,
  type FinancePulse,
} from "@/lib/finance/search-actions";

// Read once for every Finance page shown within this delay: the bell and
// the search do not reload it at each move between sections.
const KEEP_MS = 60_000;
let kept: { at: number; promise: Promise<FinancePulse> } | null = null;

function pulse(): Promise<FinancePulse> {
  if (!kept || Date.now() - kept.at > KEEP_MS) {
    const promise = readFinancePulse().catch((): FinancePulse => ({
      alerts: { count: 0, danger: 0 },
      items: [],
      error: true,
    }));
    kept = { at: Date.now(), promise };
  }
  return kept.promise;
}

/**
 * The alerts count and the search index of Finance (lot 5), read after the
 * page shows, never in its way: null while it loads.
 */
export function useFinancePulse(): FinancePulse | null {
  const [value, setValue] = useState<FinancePulse | null>(null);
  useEffect(() => {
    let live = true;
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => void read(), { timeout: 1500 })
        : window.setTimeout(() => void read(), 300);
    async function read() {
      const next = await pulse();
      if (live) setValue(next);
    }
    return () => {
      live = false;
      if (typeof window.cancelIdleCallback === "function")
        window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);
  return value;
}
