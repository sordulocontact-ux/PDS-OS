// The Projects page made to steer 30 to 50 projects (PROJ-UX-01): which tab
// a project belongs to, its administrative status, its current step, the
// filters and the search. Decided by code (rule 6). Client-safe.

import { shell } from "@/lib/i18n/fr/shell";
import { progressLabel } from "@/lib/projects/progress";
import type { ProjectListItem, ProjectType } from "@/lib/projects/types";
import { normalizeSearch } from "@/lib/utils/search";

const fr = { shell };

/** Tous excludes the archives; Brouillons = not handed over yet; Actifs =
 * handed over, to accept or running. */
export const PROJECT_VIEWS = ["all", "drafts", "active"] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export const ADMIN_STATUSES = [
  "draft",
  "not_transmitted",
  "pending",
  "clarification_requested",
  "refused",
  "running",
  "done",
] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export function adminStatus(p: ProjectListItem): AdminStatus {
  if (p.status !== "launched") return p.status;
  return p.stageCount > 0 && !p.currentStage ? "done" : "running";
}

export const isDraftProject = (p: ProjectListItem) =>
  p.status === "not_transmitted";

/**
 * Its current step, in the words of its workflows; null before the launch.
 * A Contenu or an Événement never reads the music's words.
 */
export function phaseLabel(p: ProjectListItem): string | null {
  if (p.status !== "launched") return null;
  if (p.currentStage?.key === "delivery" && p.type !== "music_release")
    return fr.shell.projects.phases.delivery;
  return progressLabel(p.currentStage);
}

export const DUE_FILTERS = ["any", "next30", "overdue", "none"] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

export type ProjectFilters = {
  query: string;
  type: ProjectType | "any";
  // The artist by name: the list carries no id (Contrats does the same).
  artist: string | "any";
  responsible: string | "any";
  status: AdminStatus | "any";
  due: DueFilter;
};

export const NO_FILTERS: ProjectFilters = {
  query: "",
  type: "any",
  artist: "any",
  responsible: "any",
  status: "any",
  due: "any",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** Every filter applies at once (they combine), with the search over the
 * project, its artist and its responsible. */
export function matchesFilters(
  p: ProjectListItem,
  f: ProjectFilters,
  today: string,
): boolean {
  if (f.type !== "any" && p.type !== f.type) return false;
  if (f.artist !== "any" && p.artistName !== f.artist) return false;
  if (f.responsible !== "any" && p.responsiblePersonId !== f.responsible)
    return false;
  if (f.status !== "any" && adminStatus(p) !== f.status) return false;
  if (f.due === "none" && p.dueDate) return false;
  if (f.due === "overdue" && !(p.dueDate && p.dueDate < today)) return false;
  if (
    f.due === "next30" &&
    !(p.dueDate && p.dueDate >= today && p.dueDate <= addDays(today, 30))
  )
    return false;
  const q = normalizeSearch(f.query.trim());
  if (!q) return true;
  return [p.title, p.artistName, p.responsibleName ?? ""].some((text) =>
    normalizeSearch(text).includes(q),
  );
}

/** A draft of the form matches the search by its title, the status filter
 * « Brouillon » and no other filter. */
export function draftMatches(
  draft: { title: string },
  f: ProjectFilters,
): boolean {
  if (
    f.type !== "any" ||
    f.artist !== "any" ||
    f.responsible !== "any" ||
    f.due !== "any"
  )
    return false;
  if (f.status !== "any" && f.status !== "draft") return false;
  const q = normalizeSearch(f.query.trim());
  return !q || normalizeSearch(draft.title).includes(q);
}
