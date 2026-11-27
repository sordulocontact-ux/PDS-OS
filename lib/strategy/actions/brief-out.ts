"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { briefOutFrom } from "@/lib/strategy/brief-out";
import { loadBriefSource } from "@/lib/strategy/documents/brief-source";
import { strategyStepData } from "@/lib/strategy/step-data";
import { dbWrite } from "@/lib/strategy/write";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Validation du Brief de sortie » in its step (proto stask, stdecide,
// stresend, strelance): every transition goes through the database
// functions of the strategy's documents (create_strategy_document,
// send_strategy_document, decide_strategy_document, remind_strategy_review),
// which check the owner, the reviewers and the states.

const t = fr.strategyBriefOut;
const id = z.uuid();
const invalid = { ok: false as const, error: fr.framing.errors.invalid_input };

async function settled(
  projectId: string,
  error: Parameters<typeof dbWrite>[0],
) {
  if (error) return dbWrite(error);
  // A request, a decision or a reminder notifies someone (triggers).
  await schedulePendingPushes();
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true as const };
}

/**
 * « Envoyer en validation », or « Répondre et transmettre à nouveau »
 * (`note` = the answer): the server writes the Brief as it stands — the
 * proto's four blocks and what stays open — as the next version, then sends
 * it to the direction (always) and the creative directors ticked. Refused
 * while anything is « à arbitrer » or « à compléter ».
 */
export async function sendBriefOut(
  projectId: string,
  creativeIds: string[],
  note: string,
  done: string = t.send.done,
): Promise<WriteResult> {
  const reviewers = z.array(id).max(10).safeParse(creativeIds);
  const text = z.string().trim().max(1000).safeParse(note);
  if (!id.safeParse(projectId).success || !reviewers.success || !text.success)
    return invalid;
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project || !canEditProject(access, project))
    return { ok: false, error: fr.framing.errors.forbidden };
  const [ctx, source] = await Promise.all([
    strategyStepData(projectId),
    loadBriefSource(projectId, access),
  ]);
  if (!ctx || !source) return { ok: false, error: fr.framing.errors.not_found };
  if (!ctx.model.ready)
    return { ok: false, error: fr.framing.errors.strategy_incomplete };
  const snapshot = {
    ...source.snapshot,
    toDecide: ctx.model.openPoints.map((p, index) => ({
      key: `open-${index}`,
      dimension: p.dimension,
      text: p.text,
      critical: false,
    })),
    out: briefOutFrom(ctx.model, ctx.data.referenceDate),
  };
  return withOutcome(projectId, ["marketing"], done, async () => {
    const supabase = await createClient();
    const { data: documentId, error } = await supabase.rpc(
      "create_strategy_document",
      { p_project_id: projectId, p_kind: "brief", p_content: snapshot },
    );
    if (error || !documentId) return dbWrite(error);
    const sent = await supabase.rpc("send_strategy_document", {
      p_document_id: documentId,
      p_reviewers: reviewers.data,
      p_note: text.data,
    });
    return settled(projectId, sent.error);
  });
}

const KINDS = ["approve", "approve_reserves", "request_changes"] as const;

/**
 * « Valider le Brief de sortie » / « Valider avec réserves » / « Demander
 * une modification » (proto stdecide): the comment is the reserve — a task
 * of the project's owner — or the reason of the change. Approving accepts
 * the version's critical alerts, shown on the piece above the decision.
 */
export async function decideBriefOut(
  projectId: string,
  documentId: string,
  kind: (typeof KINDS)[number],
  comment: string,
): Promise<WriteResult> {
  const k = z.enum(KINDS).safeParse(kind);
  const c = z.string().trim().max(1000).safeParse(comment);
  if (!id.safeParse(projectId).success || !id.safeParse(documentId).success)
    return invalid;
  if (!k.success || !c.success) return invalid;
  if (k.data !== "approve" && !c.data)
    return { ok: false, error: fr.framing.errors.reason_required };
  await requireApproved();
  const done = {
    approve: t.decision.done.approve,
    approve_reserves: t.decision.done.reserves,
    request_changes: t.decision.done.changes,
  }[k.data];
  return withOutcome(projectId, ["marketing"], done, async () => {
    const supabase = await createClient();
    const { data: doc } = await supabase
      .from("strategy_documents")
      .select("content")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!doc) return { ok: false, error: fr.framing.errors.not_found };
    const content = doc.content as {
      toDecide?: Array<{ key?: string; critical?: boolean }>;
    };
    const alerts = (content.toDecide ?? []).flatMap((x) =>
      x.critical && x.key ? [x.key] : [],
    );
    const { error } = await supabase.rpc("decide_strategy_document", {
      p_document_id: documentId,
      p_approve: k.data !== "request_changes",
      p_comment: c.data,
      p_accepted_alerts: k.data === "request_changes" ? [] : alerts,
      p_reserves: k.data === "approve_reserves" ? [{ text: c.data }] : [],
    });
    return settled(projectId, error);
  });
}

/** « Relancer <Nom> » (12 hours apart at most, in SQL). */
export async function remindBriefReviewer(
  projectId: string,
  reviewId: string,
): Promise<WriteResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(reviewId).success)
    return invalid;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remind_strategy_review", {
    p_review_id: reviewId,
  });
  return settled(projectId, error);
}

/**
 * « Retirer <Nom> »: a creative asked to validate is no longer awaited (the
 * owner only, never the direction, in SQL). The version is validated if
 * nobody else is awaited.
 */
export async function withdrawStrategyReviewer(
  projectId: string,
  reviewId: string,
): Promise<WriteResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(reviewId).success)
    return invalid;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_strategy_review", {
    p_review_id: reviewId,
  });
  return settled(projectId, error);
}
