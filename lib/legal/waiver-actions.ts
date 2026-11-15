"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { WAIVER_SCOPES } from "@/lib/projects/title-board-rules";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The direction's waivers of a missing participation contract (lot 12):
// the database decides who (« validate ») and checks the participation.

const t = fr.participationWaivers.errors;

const CODES = [
  "due_in_past",
  "contract_signed",
  "waiver_open",
  "participation_not_confirmed",
  "title_abandoned",
  "waiver_revoked",
] as const;
function failure(where: string, error: { code?: string; message?: string }) {
  if (error.code === "42501")
    return { ok: false as const, error: fr.auth.errors.forbidden };
  const code = CODES.find((c) => error.message?.includes(c));
  if (code) return { ok: false as const, error: t[code] };
  if (error.message?.includes("reason_required"))
    return { ok: false as const, error: t.reasonRequired };
  if (error.message?.includes("due_required"))
    return { ok: false as const, error: t.dueRequired };
  console.error(`${where}:`, error.message);
  return { ok: false as const, error: t.failed };
}

const refresh = (projectId: string) =>
  revalidatePath(routes.project(projectId), "layout");

const grantInput = z.object({
  projectId: z.uuid(),
  participationId: z.uuid(),
  scope: z.enum(WAIVER_SCOPES),
  reason: z.string().trim().max(2000),
  risk: z.string().trim().max(2000),
  dueOn: z.union([z.iso.date(), z.literal("")]),
});

/** « Accorder une dérogation » (the direction). */
export async function grantParticipationWaiver(
  value: z.input<typeof grantInput>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = grantInput.safeParse(value);
  if (!parsed.success) return { ok: false, error: t.failed };
  const v = parsed.data;
  if (!v.reason) return { ok: false, error: t.reasonRequired };
  if (!v.dueOn) return { ok: false, error: t.dueRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("grant_participation_waiver", {
    p_participation_id: v.participationId,
    p_scope: v.scope,
    p_reason: v.reason,
    p_due_on: v.dueOn,
    ...(v.risk ? { p_risk: v.risk } : {}),
  });
  if (error) return failure("grantParticipationWaiver", error);
  refresh(v.projectId);
  return { ok: true };
}

const revokeInput = z.object({
  projectId: z.uuid(),
  waiverId: z.uuid(),
  reason: z.string().trim().max(2000),
});

/** « Révoquer la dérogation » (the direction): traced, kept. */
export async function revokeParticipationWaiver(
  value: z.input<typeof revokeInput>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = revokeInput.safeParse(value);
  if (!parsed.success) return { ok: false, error: t.failed };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_participation_waiver", {
    p_waiver_id: v.waiverId,
    ...(v.reason ? { p_reason: v.reason } : {}),
  });
  if (error) return failure("revokeParticipationWaiver", error);
  refresh(v.projectId);
  return { ok: true };
}
