import "server-only";

import { revalidatePath } from "next/cache";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Result of a Conception action that stays on the page: ok, or a sentence
// to show (fr.conception.errors).
export type DesignResult = { ok: true } | { ok: false; error: string };

type DbError = { code?: string; message: string } | null;

/** The person-facing sentence for a refusal of the database. */
export function designError(error: NonNullable<DbError>): string {
  const t = fr.conception.errors;
  if (error.message.includes("not_a_validator")) return t.notValidator;
  // MKT-C2-08: approval apart from creation, delegations.
  if (error.message.includes("self_approval")) return t.selfApproval;
  if (error.message.includes("invalid_delegation")) return t.invalidDelegation;
  // MKT-C2-11: what was sent changed since.
  if (error.message.includes("submission_outdated"))
    return t.submissionOutdated;
  if (error.code === "42501")
    return error.message.includes("not_the_project_owner")
      ? t.forbidden
      : t.notAllowed;
  if (error.message.includes("previous_stage_not_validated"))
    return t.strategyFirst;
  if (error.message.includes("stage_locked")) return t.locked;
  if (error.message.includes("lever_not_selected")) return t.leverRequired;
  if (error.message.includes("call_not_in_project")) return t.callRequired;
  const codes: Array<[string, string]> = [
    ["proposals_pending", t.proposalsPending],
    ["nothing_to_confirm", t.nothingToConfirm],
    ["person_not_member", t.personNotMember],
    ["person_cannot_see_project", t.personCannotSeeProject],
    ["validator_required", t.validatorRequired],
    ["responsible_required", t.responsibleRequired],
    ["already_pending", t.alreadyPending],
    ["already_decided", t.alreadyDecided],
    ["not_a_validator", t.notValidator],
    ["reason_required", t.reasonRequired],
    ["not_validated", t.notValidated],
    ["already_transferred", t.alreadyTransferred],
  ];
  const known = codes.find(([code]) => error.message.includes(code));
  if (known) return known[1];
  if (error.code === "23514" || error.code === "22P02") return t.invalid;
  return t.generic;
}

/** Refreshes the project after a write: the Conception, its chevrons and dots. */
export function refreshConception(projectId: string) {
  revalidatePath(routes.project(projectId), "layout");
}

/** ok, or the database's refusal as a sentence. */
export function designDone(
  projectId: string,
  error: DbError,
  where: string,
): DesignResult {
  if (error) {
    console.error(`${where}:`, error.code, error.message);
    return { ok: false, error: designError(error) };
  }
  refreshConception(projectId);
  return { ok: true };
}
