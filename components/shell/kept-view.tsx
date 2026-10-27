"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// The last rendering of a streamed zone of the page (the project's
// navigation, its header, « Maintenant »), per zone and URL, shown again
// while its next rendering streams (components/projects/project-fresh.tsx).
// In memory only, for this tab; never data of its own.
const MAX_KEPT = 60;
const kept = new Map<string, React.ReactNode>();

const keyOf = (id: string, pathname: string) => `${id}@${pathname}`;

/** Renders `children` and keeps them as the zone's last rendering. */
export function KeptView({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => {
    const key = keyOf(id, pathname);
    kept.delete(key);
    kept.set(key, children);
    // The oldest first in a Map: drop them beyond the cap.
    for (const old of kept.keys()) {
      if (kept.size <= MAX_KEPT) break;
      kept.delete(old);
    }
  }, [id, pathname, children]);
  return children;
}

/** The zone's last rendering at this URL, else `fallback` (first visit). */
export function KeptFallback({
  id,
  fallback = null,
}: {
  id: string;
  fallback?: React.ReactNode;
}) {
  const pathname = usePathname();
  return kept.get(keyOf(id, pathname)) ?? fallback;
}
