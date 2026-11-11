// Database refusals of create_project / update_project, as form errors.

import type { FieldErrors } from "@/lib/auth/form-state";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

const pe = fr.shell.newProject.errors;

// Rules of check_project_shape and of the type (raised as P0001).
const SHAPE_ERRORS: Array<[string, FieldErrors]> = [
  ["music_release_requires_master", { masterIds: pe.mastersRequired }],
  ["single_requires_one_master", { masterIds: pe.singleOneMaster }],
  ["music_format_required", { musicFormat: pe.musicFormatRequired }],
  ["project_type_unavailable", { type: pe.typeUnavailable }],
];

export function shapeError(
  message: string | undefined,
): { fieldErrors: FieldErrors } | null {
  for (const [needle, fieldErrors] of SHAPE_ERRORS) {
    if (message?.includes(needle)) return { fieldErrors };
  }
  return null;
}

// Refusals proper to a collective (create_collective_project,
// set_project_main_artist through update_project; lot 5 of
// docs/pds-mic-plan.md). null: not one of them.
export function collectiveError(
  error: { code?: string; message?: string } | null,
): { fieldErrors?: FieldErrors; formError?: string } | null {
  const message = error?.message ?? "";
  // Main and guest of the project at once, never.
  if (message.includes("main_artist_is_guest"))
    return { fieldErrors: { mainArtistId: pe.mainArtistIsGuest } };
  if (message.includes("artist_required"))
    return { fieldErrors: { mainArtistId: pe.mainArtistRequired } };
  if (message.includes("artist_not_found"))
    return { fieldErrors: { mainArtistId: pe.invalidMainArtist } };
  if (message.includes("selection_not_found"))
    return { fieldErrors: { selectionId: pe.selectionNotFound } };
  // The selection changed hands meanwhile (or was never theirs).
  if (message.includes("assignee_not_self") || error?.code === "42501")
    return { formError: pe.notSelectionHolder };
  return null;
}

// A foreign key refused: which link is gone, read from its constraint name.
export function foreignKeyError(error: {
  message?: string;
  details?: string;
}): FieldErrors {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (text.includes("content_format"))
    return { contentFormatId: pe.invalidContentFormat };
  if (text.includes("projects_artist")) return { artistId: pe.invalidArtist };
  return { masterIds: pe.invalidMasters };
}
