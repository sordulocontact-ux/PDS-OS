"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
  type FramingErrorCode,
} from "@/lib/framing/result";
import { assessStrategy } from "@/lib/strategy/assess";
import {
  buildStrategySnapshot,
  strategySnapshotMatches,
  strategySnapshotOf,
} from "@/lib/strategy/brief-snapshot";
import { loadStrategy } from "@/lib/strategy/queries";
import { snapshotProjectOf } from "@/lib/strategy/project";
import { createClient } from "@/lib/supabase/server";

const id = z.uuid();

function refresh(projectId: string) {
  // The pilot, the Brief, the documents and the follow-up share a layout.
  revalidatePath(routes.projectStrategy(projectId), "layout");
  revalidatePath(routes.project(projectId), "layout");
}

function settle(
  projectId: string,
  error: { code?: string; message?: string } | null,
): ActionResult {
  if (error) return fromDatabaseError(error);
  refresh(projectId);
  return ok;
}

/** « Commencer la stratégie »: the entry gives way to the pilot. */
export async function startStrategy(projectId: string): Promise<void> {
  if (!id.safeParse(projectId).success) return;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_strategy", {
    p_project_id: projectId,
  });
  if (error) console.error("startStrategy:", error.message);
  refresh(projectId);
  redirect(routes.projectStrategy(projectId));
}

/** « Réviser la stratégie »: a new version will follow V1, never replace it. */
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

/**
 * « Générer le Brief de sortie »: the snapshot is written here, on the
 * server, from the database (never sent by the browser), and only once the
 * eight dimensions are sufficiently filled in.
 */
export async function generateStrategyBrief(
  projectId: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success) return fail("invalid_input");
  const access = await requireApproved();
  const data = await loadStrategy(projectId, access);
  if (!data) return fail("not_found");
  const assessment = assessStrategy(data);
  if (!assessment.ready) return fail("strategy_incomplete");
  const project = await snapshotProjectOf(projectId, data.referenceDate);
  if (!project) return fail("not_found");
  const snapshot = buildStrategySnapshot(data, assessment, project);
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_strategy_document", {
    p_project_id: projectId,
    p_kind: "brief",
    p_content: snapshot,
  });
  return settle(projectId, error);
}

const sendInput = z.object({
  projectId: id,
  documentId: id,
  reviewers: z.array(id).max(10),
  note: z.string().trim().max(1000),
});

/** « Demander la validation »: the director, plus the creatives named. */
export async function sendStrategyDocument(
  input: z.input<typeof sendInput>,
): Promise<ActionResult> {
  const p = sendInput.safeParse(input);
  if (!p.success) return fail("invalid_input");
  const access = await requireApproved();
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("strategy_documents")
    .select("kind, content")
    .eq("id", p.data.documentId)
    .eq("project_id", p.data.projectId)
    .maybeSingle();
  if (!doc) return fail("not_found");
  // A Brief must still say what the strategy says when it is sent.
  if (doc.kind === "brief") {
    const stored = strategySnapshotOf(doc.content);
    const data = await loadStrategy(p.data.projectId, access);
    const project = data
      ? await snapshotProjectOf(p.data.projectId, data.referenceDate)
      : null;
    if (!stored || !data || !project) return fail("not_found");
    const live = buildStrategySnapshot(data, assessStrategy(data), project);
    if (!strategySnapshotMatches(stored, live))
      return fail("strategy_outdated");
  }
  const { error } = await supabase.rpc("send_strategy_document", {
    p_document_id: p.data.documentId,
    p_reviewers: p.data.reviewers,
    p_note: p.data.note,
  });
  return settle(p.data.projectId, error);
}

const decideInput = z.object({
  projectId: id,
  documentId: id,
  approve: z.boolean(),
  comment: z.string().trim().max(2000),
});

export async function decideStrategyDocument(
  input: z.input<typeof decideInput>,
): Promise<ActionResult> {
  const p = decideInput.safeParse(input);
  if (!p.success) return fail("invalid_input");
  if (!p.data.approve && p.data.comment === "") return fail("reason_required");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_strategy_document", {
    p_document_id: p.data.documentId,
    p_approve: p.data.approve,
    p_comment: p.data.comment,
  });
  return settle(p.data.projectId, error);
}

/** « Relancer »: a notification to a reviewer who has not answered. */
export async function remindReviewer(
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

export type ShareResult =
  { ok: true; path: string } | { ok: false; error: FramingErrorCode };

/** « Partager »: a link to this version, readable without an account. */
export async function shareStrategyDocument(
  projectId: string,
  documentId: string,
): Promise<ShareResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(documentId).success)
    return { ok: false, error: "invalid_input" };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("share_strategy_document", {
    p_document_id: documentId,
  });
  if (error || !data) {
    const result = fromDatabaseError(error);
    return { ok: false, error: result.ok ? "generic" : result.error };
  }
  return { ok: true, path: routes.sharedDocument(data) };
}
