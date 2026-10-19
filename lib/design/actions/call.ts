"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { refreshConception } from "@/lib/design/actions/shared";
import { fillDesignFromCall } from "@/lib/design/import-call";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const attachSchema = z.object({
  projectId: z.uuid(),
  callId: z.uuid(),
  purpose: z.string().trim().min(1).max(500),
  // Empty: the exchange is about the whole release.
  deliverableIds: z.array(z.uuid()).max(50),
});

/**
 * « Rattacher un call existant » (MKT-C2-05): a call of the project becomes
 * a creative exchange of the Conception, for the release or some
 * deliverables. Its report, if already processed, is read at once like a
 * prepared exchange's (fillDesignFromCall: PO proposes, a person confirms).
 * The owner only (RLS on design_calls).
 */
export async function attachDesignCall(
  input: z.input<typeof attachSchema>,
): Promise<WriteResult> {
  const t = fr.conceptionCall;
  const p = attachSchema.safeParse(input);
  if (!p.success) return { ok: false, error: t.failed };
  const access = await requireApproved();
  if (!access.organizationId) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { error } = await supabase.from("design_calls").insert({
    organization_id: access.organizationId,
    project_id: p.data.projectId,
    call_id: p.data.callId,
    purpose: p.data.purpose,
    format: "video",
    deliverable_ids: p.data.deliverableIds,
  });
  if (error) {
    console.error("attachDesignCall:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? fr.conception.errors.forbidden
          : error.code === "23505"
            ? t.alreadyAttached
            : t.failed,
    };
  }
  await fillDesignFromCall(supabase, access, p.data.callId);
  refreshConception(p.data.projectId);
  return { ok: true };
}
