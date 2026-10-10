"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { loadBriefSource } from "@/lib/strategy/documents/brief-source";
import { createClient } from "@/lib/supabase/server";

// The strategy's documents go through database functions only: they check
// the owner, the reviewers and every transition (CLAUDE.md: states in SQL).

const id = z.uuid();
const reviewers = z.array(id).max(10);
const note = z.string().trim().max(1000);

async function settle(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<ActionResult> {
  if (error) return fromDatabaseError(error);
  // A request, a decision or a reminder notifies someone (triggers).
  await schedulePendingPushes();
  // The pilotage, the Brief and the stage bar share the project layout.
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

/** « Demander la validation » of a version already written (any kind). */
export async function sendStrategyDocument(
  projectId: string,
  documentId: string,
  reviewerIds: string[],
  requestNote: string,
): Promise<ActionResult> {
  const r = reviewers.safeParse(reviewerIds);
  const n = note.safeParse(requestNote);
  if (!id.safeParse(projectId).success || !id.safeParse(documentId).success)
    return fail("invalid_input");
  if (!r.success || !n.success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_strategy_document", {
    p_document_id: documentId,
    p_reviewers: r.data,
    p_note: n.data,
  });
  return settle(projectId, error);
}

/**
 * « Demander la validation » of the Brief de sortie: the server snapshots
 * the Brief as it stands (never sent by the browser), writes it as the next
 * version, then sends it to the director and the creatives named. Refused
 * before the Brief is established (every dimension at least started).
 */
export async function requestBriefValidation(
  projectId: string,
  reviewerIds: string[],
  requestNote: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success) return fail("invalid_input");
  const r = reviewers.safeParse(reviewerIds);
  const n = note.safeParse(requestNote);
  if (!r.success || !n.success) return fail("invalid_input");
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project || !canEditProject(access, project)) return fail("forbidden");
  const source = await loadBriefSource(projectId, access);
  if (!source) return fail("not_found");
  if (!source.ready) return fail("strategy_incomplete");

  const supabase = await createClient();
  const { data: documentId, error } = await supabase.rpc(
    "create_strategy_document",
    { p_project_id: projectId, p_kind: "brief", p_content: source.snapshot },
  );
  if (error || !documentId) return fromDatabaseError(error);
  const sent = await supabase.rpc("send_strategy_document", {
    p_document_id: documentId,
    p_reviewers: r.data,
    p_note: n.data,
  });
  return settle(projectId, sent.error);
}

/** A reviewer's decision: approve, or ask for a change with its reason. */
export async function decideStrategyDocument(
  projectId: string,
  documentId: string,
  approve: boolean,
  comment: string,
): Promise<ActionResult> {
  const c = z.string().trim().max(2000).safeParse(comment);
  if (!id.safeParse(projectId).success || !id.safeParse(documentId).success)
    return fail("invalid_input");
  if (!c.success) return fail("invalid_input");
  if (!approve && c.data === "") return fail("reason_required");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_strategy_document", {
    p_document_id: documentId,
    p_approve: approve,
    p_comment: c.data,
  });
  return settle(projectId, error);
}

/** « Relancer » a reviewer who has not answered (12 hours apart at most). */
export async function remindStrategyReview(
  projectId: string,
  reviewId: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(reviewId).success)
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remind_strategy_review", {
    p_review_id: reviewId,
  });
  return settle(projectId, error);
}

/**
 * « Réviser la stratégie »: after V1, a significant change opens a
 * revision; the next version is validated by the same circuit, V1 stays the
 * reference until then and is never overwritten.
 */
export async function openStrategyRevision(
  projectId: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_strategy_revision", {
    p_project_id: projectId,
  });
  return settle(projectId, error);
}
