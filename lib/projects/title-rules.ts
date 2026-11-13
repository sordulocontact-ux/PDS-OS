// The titles of a collective project (docs/pds-mic-plan.md § 3, lot 2), as
// the screens read them. Pure: shared by the server and the client.

import type { DemoStatus } from "@/lib/catalog/demo-rules";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type {
  ParticipationRole,
  TitleParticipation,
} from "@/lib/projects/participation-rules";

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
 * the Catalogue, and its artists' participations (lot 3). */
export type ProjectTitle = {
  id: string;
  // « Titre 3 »: its number in the project, kept when it is abandoned.
  position: number;
  workingTitle: string | null;
  status: ProjectTitleStatus;
  master: {
    id: string;
    title: string;
    // A name PDS OS gave while waiting for the real one (lot 7, voie A):
    // never the title's name in the project.
    provisional: boolean;
    // Null when the master is not a maquette.
    demoStatus: DemoStatus | null;
    // Its credits in the Catalogue, in their order.
    credits: Array<{
      artist: { id: string; name: string };
      role: ParticipationRole;
    }>;
  } | null;
  abandonedAt: string | null;
  abandonReason: string | null;
  // Active first, declined and withdrawn after (sortParticipations).
  participations: TitleParticipation[];
  // Its master is also in a project that is not collective: no automatic
  // credit (décision 10). The names of those the viewer sees, and how many
  // others; null when it is in no such project.
  sharedWith: { names: string[]; hidden: number } | null;
};

/** How a confirmation credits the title: now (in the Catalogue), later
 * (once it is), or never automatically (its master is also in a project
 * that is not collective: credits to check by hand, décision 10). */
export function creditModeOf(
  title: Pick<ProjectTitle, "master" | "sharedWith">,
): "now" | "later" | "manual" {
  if (title.sharedWith) return "manual";
  return title.master ? "now" : "later";
}

/** The master's name as the title's name: none while it is provisional
 * (« Titre 3 · sans nom » stays, lot 7). */
export function masterNameOf(
  master: { title: string; provisional: boolean } | null,
): string | null {
  return master && !master.provisional ? master.title : null;
}

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
