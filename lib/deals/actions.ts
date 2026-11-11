"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { settleProposal } from "@/lib/deals/call-settle";
import { dealFailure } from "@/lib/deals/errors";
import { MOVABLE_DEAL_STAGES } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Every gesture on a deal goes through its SQL function, with the user's
// session (BIZ 2): the database decides who may, the code only words it.

const t = deals;

const id = z.uuid();
const optionalId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());
const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v || null)
  .pipe(z.iso.date().nullable());
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

/** The proposal of PO a saved form applied (BIZ 6); a failure is only
 * logged, the deal's change is made. */
async function applied(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string | null | undefined,
) {
  if (!proposalId || !id.safeParse(proposalId).success) return;
  const error = await settleProposal(supabase, proposalId, "applied");
  if (error) console.error("deal proposal not settled:", error);
}

function refresh(dealId?: string) {
  revalidatePath(routes.deals);
  if (dealId) revalidatePath(routes.deal(dealId));
  // Travail and the home list the deals' actions (BIZ 4).
  revalidatePath(routes.work);
  revalidatePath(routes.app);
}

const createInput = z.object({
  participationId: optionalId,
  projectId: optionalId,
  artistId: optionalId,
  assigneeId: optionalId,
  nextAction: optionalText(500),
  nextActionOn: optionalDate,
});
export type CreateDealInput = z.input<typeof createInput>;

/** « Nouveau deal » (the direction, the owner of the linked project). */
export async function createDeal(
  input: CreateDealInput,
): Promise<WriteResult & { dealId?: string }> {
  await requireApproved();
  const p = createInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.errors.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_deal", {
    p_participation_id: p.data.participationId ?? undefined,
    p_project_id: p.data.projectId ?? undefined,
    p_artist_id: p.data.artistId ?? undefined,
    p_assignee_person_id: p.data.assigneeId ?? undefined,
    p_kind: "music",
    p_next_action: p.data.nextAction ?? undefined,
    p_next_action_on: p.data.nextActionOn ?? undefined,
  });
  if (error) return { ok: false, error: dealFailure("createDeal", error) };
  await schedulePendingPushes();
  refresh(data);
  return { ok: true, done: t.done.created, dealId: data };
}

/** « Affecter » (null takes the deal back). */
export async function assignDeal(
  dealId: string,
  assigneeId: string | null,
): Promise<WriteResult> {
  await requireApproved();
  const deal = id.safeParse(dealId);
  const who = optionalId.safeParse(assigneeId);
  if (!deal.success || !who.success)
    return { ok: false, error: t.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_deal", {
    p_deal_id: deal.data,
    p_assignee_person_id: who.data ?? undefined,
  });
  if (error) return { ok: false, error: dealFailure("assignDeal", error) };
  await schedulePendingPushes();
  refresh(deal.data);
  return { ok: true, done: who.data ? t.done.assigned : t.done.unassigned };
}

/** « Passer à l'étape … » (the direction, the assignee); `proposalId`: the
 * proposal of PO it applies (BIZ 6). */
export async function setDealStage(
  dealId: string,
  stage: string,
  note?: string | null,
  proposalId?: string | null,
): Promise<WriteResult> {
  await requireApproved();
  const deal = id.safeParse(dealId);
  const to = z.enum(MOVABLE_DEAL_STAGES).safeParse(stage);
  const why = optionalText(2000).safeParse(note);
  if (!deal.success || !to.success || !why.success)
    return { ok: false, error: t.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_deal_stage", {
    p_deal_id: deal.data,
    p_stage: to.data,
    p_note: why.data ?? undefined,
  });
  if (error) return { ok: false, error: dealFailure("setDealStage", error) };
  await applied(supabase, proposalId);
  await schedulePendingPushes();
  refresh(deal.data);
  return { ok: true, done: t.done.stage(t.stages[to.data]) };
}

/** The direction's decision on a proposed accord de principe. */
export async function decideDealAgreement(
  dealId: string,
  approve: boolean,
  reason?: string | null,
): Promise<WriteResult> {
  await requireApproved();
  const deal = id.safeParse(dealId);
  const why = optionalText(2000).safeParse(reason);
  if (!deal.success || !why.success)
    return { ok: false, error: t.errors.invalid };
  if (!approve && !why.data)
    return { ok: false, error: t.errors.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_deal_agreement", {
    p_deal_id: deal.data,
    p_approve: approve,
    p_reason: why.data ?? undefined,
  });
  if (error)
    return { ok: false, error: dealFailure("decideDealAgreement", error) };
  await schedulePendingPushes();
  refresh(deal.data);
  return {
    ok: true,
    done: approve ? t.done.agreementValidated : t.done.agreementRefused,
  };
}

/** « Abandonner », a reason always. */
export async function abandonDeal(
  dealId: string,
  reason: string,
): Promise<WriteResult> {
  await requireApproved();
  const deal = id.safeParse(dealId);
  const why = optionalText(2000).safeParse(reason);
  if (!deal.success || !why.success)
    return { ok: false, error: t.errors.invalid };
  if (!why.data) return { ok: false, error: t.errors.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("abandon_deal", {
    p_deal_id: deal.data,
    p_reason: why.data,
  });
  if (error) return { ok: false, error: dealFailure("abandonDeal", error) };
  refresh(deal.data);
  return { ok: true, done: t.done.abandoned };
}

const nextInput = z.object({
  nextAction: optionalText(500),
  nextActionOn: optionalDate,
  followUpOn: optionalDate,
});
export type DealNextActionInput = z.input<typeof nextInput>;

/** « Prochaine action » and « Relancer le »; `proposalId` as above. */
export async function setDealNextAction(
  dealId: string,
  input: DealNextActionInput,
  proposalId?: string | null,
): Promise<WriteResult> {
  await requireApproved();
  const deal = id.safeParse(dealId);
  const p = nextInput.safeParse(input);
  if (!deal.success || !p.success)
    return { ok: false, error: t.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_deal_next_action", {
    p_deal_id: deal.data,
    p_next_action: p.data.nextAction ?? undefined,
    p_next_action_on: p.data.nextActionOn ?? undefined,
    p_follow_up_on: p.data.followUpOn ?? undefined,
  });
  if (error)
    return { ok: false, error: dealFailure("setDealNextAction", error) };
  await applied(supabase, proposalId);
  refresh(deal.data);
  return { ok: true, done: t.done.nextAction };
}
