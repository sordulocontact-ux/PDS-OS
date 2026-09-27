// Database refusals of create_project / update_project, as form errors.

import type { FieldErrors } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";

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
