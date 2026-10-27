"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

// A click on a link whose page is not ready yet (a project, an artist, a
// contact opened from a list, never prefetched: docs/ARCHITECTURE.md § 3
// bis) left the screen frozen without a sign (audit of 27/10/2026). Every
// ViewLink reports its pending navigation here, and one thin bar at the top
// of the window says it — past 150 ms only, so a ready page never flashes
// it. Nothing changes in the link itself: no layout shift anywhere.
let pending = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const emit = () => {
  for (const listener of listeners) listener();
};

/** Rendered inside a Link: reports while its navigation is pending. */
export function LinkPendingReporter() {
  const { pending: waiting } = useLinkStatus();
  useEffect(() => {
    if (!waiting) return;
    pending += 1;
    emit();
    return () => {
      pending -= 1;
      emit();
    };
  }, [waiting]);
  return null;
}

/** The bar, once in the authenticated shell. */
export function NavigationProgress() {
  const busy = useSyncExternalStore(
    subscribe,
    () => pending > 0,
    () => false,
  );
  if (!busy) return null;
  return (
    <div
      role="progressbar"
      aria-label={fr.auth.common.loading}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 animate-nav-reveal overflow-hidden"
    >
      <div className="h-full w-1/3 animate-nav-progress bg-primary motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  );
}
