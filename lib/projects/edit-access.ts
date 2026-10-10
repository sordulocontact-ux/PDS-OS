import { can, type Access } from "@/lib/auth/access";

// Only the project's owner writes inside it (framing, calls, release), and
// only while they hold pilot_projects. Same rule as is_project_owner() in the
// database, which enforces it; this copy only decides what the screen offers.
export function canEditProject(
  access: Access,
  project: { ownerPersonId: string | null },
): boolean {
  return (
    access.personId !== null &&
    project.ownerPersonId === access.personId &&
    can(access, "pilot_projects")
  );
}

// Who reads a project's budget (its lines, their notes, the Brief Mix/Master
// rates): its owner and the direction (UX test of 09/10/2026: the creative
// director read it). Same rule as can_read_project_budget() in the database.
export function canSeeProjectBudget(
  access: Access,
  project: { ownerPersonId: string | null },
): boolean {
  return (
    (access.personId !== null && project.ownerPersonId === access.personId) ||
    can(access, "view_all_projects")
  );
}
