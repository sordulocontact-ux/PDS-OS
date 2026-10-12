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
import { loadExecution } from "@/lib/strategy/execution-queries";
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

const reserveInput = z.object({
  text: z.string().trim().min(1).max(1000),
  ownerPersonId: id,
  dueOn: z.iso.date(),
});

/**
 * A reviewer's decision: approve (accepting the critical alerts by name,
 * with reserves or not), or ask for a change with its reason. The database
 * checks every alert is accepted and every reserve complete.
 */
export async function decideStrategyDocument(
  projectId: string,
  documentId: string,
  approve: boolean,
  comment: string,
  acceptedAlerts: string[] = [],
  reserves: Array<z.input<typeof reserveInput>> = [],
): Promise<ActionResult> {
  const c = z.string().trim().max(2000).safeParse(comment);
  const a = z.array(z.string().max(200)).max(100).safeParse(acceptedAlerts);
  const r = z.array(reserveInput).max(20).safeParse(reserves);
  if (!id.safeParse(projectId).success || !id.safeParse(documentId).success)
    return fail("invalid_input");
  if (!c.success || !a.success) return fail("invalid_input");
  if (!r.success) return fail("invalid_reserve");
  if (!approve && c.data === "") return fail("reason_required");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_strategy_document", {
    p_document_id: documentId,
    p_approve: approve,
    p_comment: c.data,
    p_accepted_alerts: approve ? a.data : [],
    p_reserves: approve
      ? r.data.map((x) => ({
          text: x.text,
          owner_person_id: x.ownerPersonId,
          due_on: x.dueOn,
        }))
      : [],
  });
  return settle(projectId, error);
}

/** « Lever la réserve »: its owner or the project's owner, with a note. */
export async function liftStrategyReserve(
  projectId: string,
  reserveId: string,
  liftNote: string,
): Promise<ActionResult> {
  const n = z.string().trim().max(1000).safeParse(liftNote);
  if (!id.safeParse(projectId).success || !id.safeParse(reserveId).success)
    return fail("invalid_input");
  if (!n.success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("lift_strategy_reserve", {
    p_reserve_id: reserveId,
    p_note: n.data,
  });
  return settle(projectId, error);
}

/**
 * « Confirmer le plan d'exécution »: the plan is computed again here by the
 * code (never taken from the browser), only the elements the owner kept are
 * created, with the user's session; one already created is skipped in SQL.
 */
export async function applyExecutionPlan(
  projectId: string,
  documentId: string,
  keys: string[],
): Promise<ActionResult & { created?: number }> {
  const k = z.array(z.string().max(100)).max(200).safeParse(keys);
  if (!id.safeParse(projectId).success || !id.safeParse(documentId).success)
    return fail("invalid_input");
  if (!k.success) return fail("invalid_input");
  await requireApproved();
  const { plan } = await loadExecution(projectId);
  const kept = new Set(k.data);
  const items = plan.items
    .filter((i) => kept.has(i.key))
    .map((i) =>
      i.kind === "activation"
        ? {
            kind: "activation",
            lever_id: i.leverId,
            activation_kind: i.activationKind,
          }
        : { kind: "task", deliverable_id: i.deliverableId },
    );
  if (items.length === 0) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_strategy_execution", {
    p_document_id: documentId,
    p_items: items,
  });
  if (error) return fromDatabaseError(error);
  const settled = await settle(projectId, null);
  return settled.ok ? { ok: true, created: data ?? 0 } : settled;
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
