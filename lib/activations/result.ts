import "server-only";

import { revalidatePath } from "next/cache";

import { launchGapsText } from "@/lib/activations/describe";
import { LAUNCH_GAPS, type LaunchGap } from "@/lib/activations/model";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.activations.errors;
const i = fr.activationInfluence.errors;

// Database refusals → their sentence. Codes raised by the activation
// functions and triggers (supabase/migrations/20261011000*).
const MESSAGES: Array<[string, string]> = [
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
