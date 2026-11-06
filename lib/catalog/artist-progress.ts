// Where an artist's projects stand (proto `docs/protos/pages.html`,
// « Artistes »): each launched project and the place of its open step (the
// Artistes list), read from the project's journeys (loadShellActions, the
// source of Travail and the home); the next release. Computed by code,
// never stored. Client-safe: the list's table reads it.

import type { ArtistListItem } from "@/lib/catalog/types";
import type { ProjectAction, ProjectJourneys } from "@/lib/journey/types";
import { projectFormatLabel } from "@/lib/projects/labels";
import type { ProjectListItem } from "@/lib/projects/types";
import { daysBetween } from "@/lib/utils/calendar-period";

/** One launched project of the artist and where it stands. */
export type ProjectProgress = {
  projectId: string;
  title: string;
  // « Single », « PDS Mic »; null when the format is unknown.
  format: string | null;
  // « Master › Mixage »: the journey's place and the open step; null when
  // no step asks anything of anyone.
  place: string | null;
  // The release a musical project aims for, the due date of another.
  dueDate: string | null;
  music: boolean;
};

// `days`: from today, counted by code (« dans 37 jours »).
export type NextRelease = { projectTitle: string; date: string; days: number };

export type ArtistProgress = {
  ongoing: ProjectProgress[];
  next: NextRelease | null;
};

// Late first, then the earliest due date, undated last.
const byUrgency = (a: ProjectAction, b: ProjectAction) =>
  Number(b.step.alert === "overdue") - Number(a.step.alert === "overdue") ||
  (a.step.due ?? "9999").localeCompare(b.step.due ?? "9999");

/** The viewer's own move first (Cadrage first, as Travail), else what the
 * project waits for most urgently. */
export function progressOf(
  project: ProjectListItem,
  journeys: ProjectJourneys,
): ProjectProgress {
  const mine = journeys.mine[0];
  const other = mine ? undefined : [...journeys.waiting].sort(byUrgency)[0];
  const action = mine ?? other;
  return {
    projectId: project.id,
    title: project.title,
    format: projectFormatLabel(project),
    place: action ? `${action.place} › ${action.step.title}` : null,
    dueDate: project.dueDate,
    music: project.type === "music_release",
  };
}

/** The artist's launched projects, the nearest date first, and the next
 * release: the nearest date still to come of a musical project. */
export function artistProgressOf(
  projects: ProjectProgress[],
  today: string,
): ArtistProgress {
  const ongoing = [...projects].sort(
    (a, b) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      a.title.localeCompare(b.title, "fr"),
  );
  const coming = ongoing.find(
    (p) => p.music && p.dueDate !== null && p.dueDate >= today,
  );
  return {
    ongoing,
    next:
      coming && coming.dueDate
        ? {
            projectTitle: coming.title,
            date: coming.dueDate,
            days: daysBetween(today, coming.dueDate),
          }
        : null,
  };
}

/** A row of the artists list: the artist and where its projects stand. */
export type ArtistRow = ArtistListItem & ArtistProgress;
