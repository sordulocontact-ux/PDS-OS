"use client";

import { useEffect, useSyncExternalStore } from "react";

// The viewer's « À vous » count on each Marketing pill (proto « Projet
// complet », SubModuleTabs `mine`). The project's navigation reads its
// journeys anyway (components/projects/project-nav-counted.tsx): it reports
// the counts here, and the header (a client component) reads them, so the
// header never waits for the journeys. Nothing is stored.
let current: { projectId: string; counts: Record<string, number> } | null =
  null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const NONE: Record<string, number> = {};

/** Each pill's count in the project open (none before they are read). */
export function useSubModuleCounts(projectId: string): Record<string, number> {
  const value = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return value?.projectId === projectId ? value.counts : NONE;
}

/** Rendered by the project's navigation once its journeys are read. */
export function SubModuleCountsReporter({
  projectId,
  counts,
}: {
  projectId: string;
  counts: Record<string, number>;
}) {
  const key = JSON.stringify(counts);
  useEffect(() => {
    current = { projectId, counts: JSON.parse(key) as Record<string, number> };
    for (const listener of listeners) listener();
  }, [projectId, key]);
  return null;
}
