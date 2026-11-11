// The titles of a collective project (docs/pds-mic-plan.md § 3, lot 2), as
// the screens read them. Pure: shared by the server and the client.

import type { DemoStatus } from "@/lib/catalog/demo-rules";
import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { projectTitles };

export const PROJECT_TITLE_STATUSES = [
  "planned",
  "active",
  "abandoned",
] as const;
export type ProjectTitleStatus = (typeof PROJECT_TITLE_STATUSES)[number];

export function projectTitleStatusOf(value: string): ProjectTitleStatus {
  return (PROJECT_TITLE_STATUSES as readonly string[]).includes(value)
    ? (value as ProjectTitleStatus)
    : "planned";
}

/** A title of the project (project_titles), with its master once it is in
 * the Catalogue. */
export type ProjectTitle = {
  id: string;
  // « Titre 3 »: its number in the project, kept when it is abandoned.
  position: number;
  workingTitle: string | null;
  status: ProjectTitleStatus;
  master: {
    id: string;
    title: string;
    // Null when the master is not a maquette.
    demoStatus: DemoStatus | null;
  } | null;
  abandonedAt: string | null;
  abandonReason: string | null;
};

/** What a title is called in the project: its working title, else its
 * master's title, else « Titre 3 · sans nom » (same rule for the history,
 * which keeps these three values as they were). */
export function projectTitleLabel(title: {
  position: number;
  workingTitle: string | null;
  masterTitle: string | null;
}): string {
  return (
    title.workingTitle ??
    title.masterTitle ??
    fr.projectTitles.unnamed(title.position)
  );
}

/** Active and planned titles first, in their order, the abandoned ones
 * after (still listed: nothing is removed). */
export function sortProjectTitles<T extends ProjectTitle>(titles: T[]): T[] {
  return [...titles].sort(
    (a, b) =>
      Number(a.status === "abandoned") - Number(b.status === "abandoned") ||
      a.position - b.position,
  );
}
