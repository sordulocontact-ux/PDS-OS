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
