"use client";

import { useEffect, useSyncExternalStore } from "react";

// The viewer's « À vous » count on each Marketing pill (proto « Projet
// complet », SubModuleTabs `mine`) and the step each pill opens on
// (lib/journey/landing.ts). The project's navigation reads its journeys
// anyway (components/projects/project-nav-counted.tsx): it reports them
// here, and the header (a client component) reads them, so the header never
// waits for the journeys. Nothing is stored.
type Reported = {
  projectId: string;
  counts: Record<string, number>;
  hrefs: Record<string, string>;
};
let current: Reported | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const NONE: Record<string, number> = {};
const NO_HREFS: Record<string, string> = {};

const useReported = (projectId: string) => {
  const value = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return value?.projectId === projectId ? value : null;
};

/** Each pill's count in the project open (none before they are read). */
export function useSubModuleCounts(projectId: string): Record<string, number> {
  return useReported(projectId)?.counts ?? NONE;
}

/** Where each module and pill opens (lib/journey/landing.ts), once read;
 * its own page meanwhile. */
export function useModuleEntries(projectId: string): Record<string, string> {
  return useReported(projectId)?.hrefs ?? NO_HREFS;
}

/** Rendered by the project's navigation once its journeys are read. */
export function SubModuleCountsReporter({
  projectId,
  counts,
  hrefs,
}: {
  projectId: string;
  counts: Record<string, number>;
  hrefs: Record<string, string>;
}) {
  const key = JSON.stringify([counts, hrefs]);
  useEffect(() => {
    const [c, h] = JSON.parse(key) as [Reported["counts"], Reported["hrefs"]];
    current = { projectId, counts: c, hrefs: h };
    for (const listener of listeners) listener();
  }, [projectId, key]);
  return null;
}
