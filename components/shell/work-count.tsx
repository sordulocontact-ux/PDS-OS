"use client";

import { useEffect, useSyncExternalStore } from "react";

// The viewer's « À vous » count of the project open, shown on « Travail » in
// the main navigation (proto « Projet complet », `.navbtn .cnt`). The main
// navigation lives in the app's layout, above the project's: the project's
// layout reports the count here, and takes it back when it is left. Nothing
// is stored.
let value = 0;
const listeners = new Set<() => void>();

function set(next: number) {
  value = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The count reported by the project open (0 outside a project). */
export function useWorkCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => value,
    () => 0,
  );
}

/** Rendered by the project's layout once its journeys are read. */
export function WorkCountReporter({ count }: { count: number }) {
  useEffect(() => {
    set(count);
    return () => set(0);
  }, [count]);
  return null;
}
