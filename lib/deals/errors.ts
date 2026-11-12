import { deals } from "@/lib/i18n/fr/deals";

const t = deals.errors;

// The SQL functions' exceptions (20261111230101_deals.sql and its terms),
// said in French; each is matched whole.
const MESSAGES: Record<string, string> = {
  forbidden: t.forbidden,
  deal_not_found: t.notFound,
  deal_closed: t.closed,
  deal_kind_unavailable: t.kindUnavailable,
  deal_subject_required: t.subjectRequired,
  participation_not_found: t.participationNotFound,
  participation_other_project: t.participationOtherProject,
  participation_other_artist: t.participationOtherArtist,
  use_participation: t.useParticipation,
  participation_not_in_play: t.participationNotInPlay,
  collective_needs_participation: t.collectiveNeedsParticipation,
  project_not_found: t.projectNotFound,
  artist_not_found: t.artistNotFound,
  deal_exists: t.exists,
  assignee_cannot_negotiate: t.assigneeCannotNegotiate,
  assignee_unchanged: t.assigneeUnchanged,
  stage_unchanged: t.stageUnchanged,
  agreement_not_validated: t.agreementNotValidated,
  not_contracting: t.notContracting,
  no_agreement_pending: t.noAgreementPending,
  reason_required: t.reasonRequired,
  next_action_unchanged: t.nextActionUnchanged,
  term_unchanged: t.termUnchanged,
  term_value_required: t.termValueRequired,
  text_too_long: t.textTooLong,
};

/** A failed deal function, in French; anything unknown is logged. */
export function dealFailure(
  where: string,
  error: { code?: string; message?: string },
): string {
  const message = error.message ?? "";
  if (message in MESSAGES) return MESSAGES[message];
  if (error.code === "42501" || message.includes("row-level security"))
    return t.forbidden;
  console.error(`${where}:`, error.code, message);
  return t.generic;
}
