import type { CallDoor } from "@/lib/calls/door";
import { routes } from "@/lib/auth/redirects";

/** The Notes list of a door: the main navigation's, or a project's. */
export function notesPath(door: CallDoor): string {
  return door.kind === "project"
    ? routes.projectNotes(door.projectId)
    : routes.notes;
}
