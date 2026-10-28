"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { sendFramingBrief } from "@/lib/framing/actions/brief-versions";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { fromDatabaseError, type ActionResult } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The gestures of the step « Brief de cadrage » (proto frBrief), each with
// what follows (rule 7): send the Cadrage as a version, and the direction's
// decision in the step — validate, or ask for a change on the dimensions
// checked, with a comment. States move in SQL only. The viewer's next step,
// on another page, opens by itself (lot 3 of Ibé's feedback).

const t = fr.framingJourney.done;

const asWrite = (result: ActionResult): WriteResult =>
  result.ok
    ? { ok: true }
    : { ok: false, error: fr.framing.errors[result.error] };

/** « Envoyer en validation à X »: the version made and sent in one gesture
 * (a reason when nothing changed since the last one sent). */
export async function sendBriefVersion(
  projectId: string,
  unchangedReason = "",
): Promise<WriteResult> {
  return withOutcome(
    projectId,
    ["framing"],
    t.briefSent,
    async () => asWrite(await sendFramingBrief(projectId, unchangedReason)),
    { openNext: true },
  );
}

/**
 * The direction's decision (proto « Le projet est-il assez clair… »):
 * « Valider le Brief » (refused while a mandatory request is open), or
 * « Demander une modification » with a comment and at least one dimension
 * to review; only those reopen (decide_framing_brief, dimensions form).
 */
export async function decideFramingBrief(
  projectId: string,
  validationId: string,
  approve: boolean,
  comment: string,
  dimensions: string[],
): Promise<WriteResult> {
  const p = z
    .object({
      projectId: z.uuid(),
      validationId: z.uuid(),
      comment: z.string().trim().max(2000),
      dimensions: z.array(z.enum(DIMENSIONS)).max(DIMENSIONS.length),
    })
    .safeParse({ projectId, validationId, comment, dimensions });
  if (!p.success) return { ok: false, error: fr.framing.errors.invalid_input };
  if (!approve && p.data.dimensions.length === 0)
    return { ok: false, error: fr.framingJourney.brief.dimsRequired };
  if (!approve && !p.data.comment)
    return { ok: false, error: fr.framingJourney.brief.commentRequired };
  await requireApproved();
  return withOutcome(
    projectId,
    ["framing"],
    approve ? t.briefValidated : t.changesRequested,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("decide_framing_brief", {
        p_validation_id: p.data.validationId,
        p_approve: approve,
        p_comment: p.data.comment,
        p_dimensions: approve ? undefined : p.data.dimensions,
      });
      if (error) return asWrite(fromDatabaseError(error));
      await schedulePendingPushes();
      revalidatePath(routes.project(projectId), "layout");
      return { ok: true };
    },
    { openNext: true },
  );
}
