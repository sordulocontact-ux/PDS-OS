"use client";

import { useEffect, useSyncExternalStore } from "react";

// The viewer's « À vous » count on « Travail » in the main navigation (proto
// « Projet complet », `.navbtn .cnt`). Inside a project: that project's
// actions, reported by its layout. Outside: the sum over every project
// (lib/work/journeys.ts), reported project by project by the home and the
// Travail (which read them anyway), then kept up to date by each project
// visited. Nothing is stored; before the home or the Travail has been seen,
// no count shows outside a project.
type Counts = {
  // The project open (null outside, or before its journeys are read).
  project: number | null;
  // Every project's count, once the home or the Travail reported them.
  byProject: Record<string, number> | null;
};
let counts: Counts = { project: null, byProject: null };
const listeners = new Set<() => void>();

function set(next: Partial<Counts>) {
  counts = { ...counts, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const NULL_COUNTS: Counts = { project: null, byProject: null };

/** The count to show: the project's inside one, the sum outside. */
export function useWorkCount(inProject: boolean): number {
  const current = useSyncExternalStore(
    subscribe,
    () => counts,
    () => NULL_COUNTS,
  );
  if (inProject) return current.project ?? 0;
  return Object.values(current.byProject ?? {}).reduce((a, b) => a + b, 0);
}

/** Rendered by the project's layout once its journeys are read. */
export function WorkCountReporter({
  projectId,
  count,
}: {
  projectId: string;
  count: number;
}) {
  useEffect(() => {
    set({
      project: count,
      byProject: counts.byProject && {
        ...counts.byProject,
        [projectId]: count,
      },
    });
    return () => set({ project: null });
  }, [projectId, count]);
  return null;
}

/** Rendered by the home and the Travail: each project's count. */
export function GlobalWorkCountReporter({
  byProject,
}: {
  byProject: Record<string, number>;
}) {
  const key = JSON.stringify(byProject);
  useEffect(() => {
    set({ byProject: JSON.parse(key) as Record<string, number> });
  }, [key]);
  return null;
}
