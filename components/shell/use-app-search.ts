"use client";

import { useEffect, useState } from "react";

import { appSearch } from "@/lib/search/actions";
import type { SearchResult } from "@/lib/search/types";

const DEBOUNCE_MS = 150;

/**
 * The hits for what is typed, read by the server action after a short pause;
 * `null` until the first answer. Only runs while the window is open.
 */
export function useAppSearch(query: string, enabled: boolean) {
  const [state, setState] = useState<{
    query: string;
    result: SearchResult;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stale = false;
    const timer = setTimeout(
      () => {
        appSearch(query)
          .then((result) => {
            if (!stale) setState({ query, result });
          })
          .catch(() => {
            if (!stale) setState({ query, result: { hits: [], error: true } });
          });
      },
      query ? DEBOUNCE_MS : 0,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return {
    hits: state?.result.hits ?? [],
    error: state?.result.error ?? false,
    // True while the answer is not yet the one for this text.
    pending: state?.query !== query,
  };
}
