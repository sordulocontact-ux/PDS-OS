"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { RESERVE_DECISIONS } from "@/lib/marketing/closure/reserves";
import { RESERVE_CATEGORIES } from "@/lib/marketing/reports/model";
import { marketingFailure } from "@/lib/marketing/result";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Écran 4 (ticket « Suivi & bilan »): arbitrating each reserve, following it,
// lifting it, a task behind it only when the owner asks. The database
// decides who may (owner arbitrates; the direction accepts a definitive
// limit; whoever follows a reserve notes and lifts it).

const e = fr.marketingReview.closure.errors;

function failure(error: { code?: string; message?: string }): WriteResult {
  const m = error.message ?? "";
  const known: [string, string][] = [
    ["limit_needs_direction", e.limitNeedsDirection],
    ["reason_required", e.reasonRequired],
    ["follow_up_incomplete", e.followUpIncomplete],
    ["invalid_duplicate", e.invalidDuplicate],
    ["task_already_created", e.taskAlreadyCreated],
    ["invalid_task", e.invalidTask],
    ["invalid_transition", e.transition],
  ];
  const hit = known.find(([code]) => m.includes(code));
  if (hit) return { ok: false, error: hit[1] };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  return marketingFailure(error);
}

async function run(
  projectId: string,
  call: (
    supabase: Awaited<ReturnType<typeof createClient>>,
  ) => PromiseLike<{ error: { code?: string; message?: string } | null }>,
): Promise<WriteResult> {
  await requireApproved();
  const { error } = await call(await createClient());
  if (error) return failure(error);
  revalidatePath(routes.projectReview(projectId), "layout");
  return { ok: true };
}

const invalid = { ok: false, error: fr.marketing.errors.invalid } as const;
const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .transform((v) => v || null);

const arbitrateInput = z.object({
  projectId: z.uuid(),
  reserveId: z.uuid(),
  decision: z.enum(RESERVE_DECISIONS),
  reason: z.string().trim().max(1000),
  followUpPersonId: optionalUuid,
  followUpDueOn: z.union([z.iso.date(), z.literal("")]),
  followUpChannel: z.string().trim().max(200),
  duplicateOf: optionalUuid,
});

/** « Arbitrer » a reserve. */
export async function arbitrateReserve(
  input: z.input<typeof arbitrateInput>,
): Promise<WriteResult> {
  const p = arbitrateInput.safeParse(input);
  if (!p.success) return invalid;
  const d = p.data;
  return run(d.projectId, (supabase) =>
    supabase.rpc("arbitrate_marketing_reserve", {
      p_reserve_id: d.reserveId,
      p_decision: d.decision,
      p_reason: d.reason,
      // Optional in SQL; the generated types cannot say an argument is
      // nullable.
      p_follow_up_person_id: d.followUpPersonId as string,
      p_follow_up_due_on: (d.followUpDueOn || null) as string,
      p_follow_up_channel: d.followUpChannel,
      p_duplicate_of: d.duplicateOf as string,
    }),
  );
}

const noteInput = z.object({
  projectId: z.uuid(),
  reserveId: z.uuid(),
  note: z.string().trim().max(2000),
});

/** « Lever la réserve », with what was done. */
export async function liftReserve(
  input: z.input<typeof noteInput>,
): Promise<WriteResult> {
  const p = noteInput.safeParse(input);
  if (!p.success || p.data.note.length > 1000) return invalid;
  const d = p.data;
  return run(d.projectId, (supabase) =>
    supabase.rpc("lift_marketing_reserve", {
      p_reserve_id: d.reserveId,
      p_note: d.note,
    }),
  );
}

/** « Noter le suivi »: where a follow-up stands. */
export async function noteReserve(
  input: z.input<typeof noteInput>,
): Promise<WriteResult> {
  const p = noteInput.safeParse(input);
  if (!p.success) return invalid;
  const d = p.data;
  return run(d.projectId, (supabase) =>
    supabase.rpc("note_marketing_reserve", {
      p_reserve_id: d.reserveId,
      p_note: d.note,
    }),
  );
}

const taskInput = z.object({
  projectId: z.uuid(),
  reserveId: z.uuid(),
  taskId: optionalUuid,
});

/** Links an existing task of the project (or unlinks it). */
export async function linkReserveTask(
  input: z.input<typeof taskInput>,
): Promise<WriteResult> {
  const p = taskInput.safeParse(input);
  if (!p.success) return invalid;
  const d = p.data;
  return run(d.projectId, (supabase) =>
    supabase.rpc("link_reserve_task", {
      p_reserve_id: d.reserveId,
      p_task_id: d.taskId as string,
    }),
  );
}

/** « Créer la tâche dans Travail »: on purpose, from the follow-up. */
export async function createReserveTask(input: {
  projectId: string;
  reserveId: string;
}): Promise<WriteResult> {
  const p = taskInput.safeParse({ ...input, taskId: "" });
  if (!p.success) return invalid;
  const d = p.data;
  return run(d.projectId, (supabase) =>
    supabase.rpc("create_reserve_task", { p_reserve_id: d.reserveId }),
  );
}

const addInput = z.object({
  projectId: z.uuid(),
  category: z.enum(RESERVE_CATEGORIES),
  description: z.string().trim().min(1).max(1000),
  activationId: optionalUuid,
});

/** « Proposer une réserve » by hand (contributors). */
export async function addReserve(
  input: z.input<typeof addInput>,
): Promise<WriteResult> {
  const p = addInput.safeParse(input);
  if (!p.success) return invalid;
  const access = await requireApproved();
  if (!access.organizationId) return { ok: false, error: e.forbidden };
  const d = p.data;
  const organizationId = access.organizationId;
  return run(d.projectId, (supabase) =>
    supabase.from("marketing_reserves").insert({
      organization_id: organizationId,
      project_id: d.projectId,
      category: d.category,
      description: d.description,
      activation_id: d.activationId,
    }),
  );
}
