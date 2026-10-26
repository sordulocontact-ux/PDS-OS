import "server-only";

import { revalidatePath } from "next/cache";

import { launchGapsText } from "@/lib/activations/describe";
import { joinList } from "@/lib/utils/sentences";
import { LAUNCH_GAPS, type LaunchGap } from "@/lib/activations/model";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { formatDay } from "@/lib/utils/day";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.activations.errors;
const i = fr.activationInfluence.errors;

// Database refusals → their sentence. Codes raised by the activation
// functions and triggers (supabase/migrations/20261011000*).
const j = fr.activationJourney.errors;
const b = fr.activationBrief;

const MESSAGES: Array<[string, string]> = [
  ["activation_not_done:no_publication", j.noPublication],
  ["activation_not_done:no_message", j.noMessage],
  ["framing_not_validated", j.framingNotValidated],
  ["press_kit_not_validated", j.kitNotValidated],
  ["reason_required", e.reasonRequired],
  ["comment_required", e.commentRequired],
  ["marketing_activations_reason_check", e.reasonRequired],
  ["marketing_activations_mode_check", e.modeRequired],
  ["marketing_activations_title_check", e.titleRequired],
  ["marketing_activations_deliverable_key", e.sourceTaken],
  ["marketing_activations_handoff_key", e.sourceTaken],
  ["activation_evidence_something_check", e.somethingRequired],
  ["verification_needs_method", e.methodRequired],
  ["activation_evidence_checks_other_check", e.methodRequired],
  ["evidence_withdrawn", e.withdrawn],
  ["metric_invalidated", e.invalidated],
  ["invalid_transition", e.transition],
  ["already_closed", e.closed],
  ["not_closed", e.transition],
  ["invalid_task", e.personRequired],
  ["terms_not_accepted", i.termsNotAccepted],
  ["proposal_not_latest", i.notLatest],
  ["agreement_required", i.agreementRequired],
  ["proof_required", i.proofRequired],
  ["rights_not_editable", i.rightsNotEditable],
  ["already_decided", i.alreadyDecided],
  ["influence_contents_media_check", i.mediaRequired],
  ["activation_not_agency", e.transition],
  ["concept_not_validated", b.brief.errors.conceptNotValidated],
  ["brief_already_sent", b.brief.errors.alreadySent],
  ["message_body_required", b.recap.errors.message],
];

export function activationFailure(error: { code?: string; message?: string }): {
  ok: false;
  error: string;
} {
  const message = error.message ?? "";
  // « activation_not_ready:owner,due » : what starting still needs.
  const notReady = /activation_not_ready:([a-z,]+)/.exec(message);
  if (notReady) {
    const gaps = notReady[1]
      .split(",")
      .filter((g): g is LaunchGap =>
        (LAUNCH_GAPS as readonly string[]).includes(g),
      );
    return { ok: false, error: e.notReady(launchGapsText(gaps)) };
  }
  // The recette of 23/10 (20261026400101): a gesture with a creator on an
  // activation not launched, closed or suspended; creators still engaged at
  // the closure; an agency campaign not settled; a deadline out of bounds.
  const frozen = /collaboration_frozen:([a-z_]+)/.exec(message)?.[1];
  if (
    frozen === "not_launched" ||
    frozen === "closed" ||
    frozen === "suspended"
  )
    return { ok: false, error: j.frozen[frozen] };
  const open = /creators_open:(.+)$/.exec(message)?.[1];
  if (open) return { ok: false, error: j.creatorsOpen(open.trim()) };
  const notDone = /activation_not_done:([a-z_,]+)/.exec(message)?.[1];
  const agency = (notDone ?? "")
    .split(",")
    .filter((g): g is keyof typeof j.agencyGaps => g in j.agencyGaps);
  if (agency.length)
    return {
      ok: false,
      error: j.agencyNotDone(
        joinList(
          agency.map((g) => j.agencyGaps[g]),
          "et",
        ),
      ),
    };
  if (message.includes("due_in_past")) return { ok: false, error: j.dueInPast };
  const end = /due_after_campaign:(\d{4}-\d{2}-\d{2})/.exec(message)?.[1];
  if (end) return { ok: false, error: j.dueAfterCampaign(formatDay(end)) };
  if (message.includes("follow_up_incomplete"))
    return { ok: false, error: j.followUpIncomplete };
  for (const [code, sentence] of MESSAGES)
    if (message.includes(code)) return { ok: false, error: sentence };
  if (message.includes("not_found")) return { ok: false, error: e.notFound };
  if (error.code === "42501" || message.includes("not_allowed"))
    return { ok: false, error: e.forbidden };
  if (["23514", "22023", "23505", "22P02", "22007"].includes(error.code ?? ""))
    return { ok: false, error: e.invalid };
  console.error("activations:", error.code, message);
  return { ok: false, error: e.generic };
}

export const invalid = (
  error: string = e.invalid,
): { ok: false; error: string } => ({
  ok: false,
  error,
});

/** Ends an activation write: the project's pages follow (Activations, the
 * Vue d'ensemble, the Travail). */
export function activationDone(projectId: string): WriteResult {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

/** An optional text from a form: trimmed, empty = null. */
export const textOrNull = (value: string | null | undefined) => {
  const v = (value ?? "").trim();
  return v === "" ? null : v;
};
