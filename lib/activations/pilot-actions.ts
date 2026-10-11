"use server";

import { z } from "zod";

import {
  BLOCKER_CATEGORIES,
  DEPENDENCY_KINDS,
  SEVERITIES,
} from "@/lib/activations/model";
import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.activations.errors;
const optionalDate = z.union([z.iso.date(), z.literal("")]).optional();
const person = z.union([z.uuid(), z.literal("")]).optional();
const origin = z.union([
  z.literal("manual"),
  z.string().regex(/^rule:[a-z_]{1,60}$/),
]);

const blockerSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  category: z.enum(BLOCKER_CATEGORIES),
  description: z.string().trim().min(1).max(1000),
  blockingObject: z.string().max(200).optional(),
  ownerPersonId: person,
  severity: z.enum(SEVERITIES),
  impact: z.string().max(1000).optional(),
  expectedResolution: optionalDate,
});

export async function addBlocker(
  input: z.input<typeof blockerSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = blockerSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("activation_blockers").insert({
    activation_id: v.activationId,
    category: v.category,
    description: v.description,
    blocking_object: textOrNull(v.blockingObject),
    owner_person_id: textOrNull(v.ownerPersonId),
    severity: v.severity,
    impact: textOrNull(v.impact),
    expected_resolution: textOrNull(v.expectedResolution),
    // Overwritten from the activation by the database.
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

/** « Résoudre » : how it was lifted, kept in the journal. */
export async function resolveBlocker(input: {
  projectId: string;
  blockerId: string;
  note: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      blockerId: z.uuid(),
      note: z.string().trim().min(1).max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return invalid(e.reasonRequired);
  const supabase = await createClient();
  const { error } = await supabase
    .from("activation_blockers")
    .update({ status: "resolved", resolution_note: parsed.data.note })
    .eq("id", parsed.data.blockerId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

const dependencySchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  kind: z.enum(DEPENDENCY_KINDS),
  objectId: z.uuid(),
  blocking: z.boolean(),
});

export async function linkDependency(
  input: z.input<typeof dependencySchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = dependencySchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("activation_dependencies").insert({
    activation_id: v.activationId,
    kind: v.kind,
    deliverable_id: v.kind === "deliverable" ? v.objectId : null,
    contract_id: v.kind === "contract" ? v.objectId : null,
    clearance_id: v.kind === "clearance" ? v.objectId : null,
    task_id: v.kind === "task" ? v.objectId : null,
    blocking: v.blocking,
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

export async function unlinkDependency(input: {
  projectId: string;
  dependencyId: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({ projectId: z.uuid(), dependencyId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase
    .from("activation_dependencies")
    .delete()
    .eq("id", parsed.data.dependencyId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

const nextSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  // The stored row to change, when there is one.
  rowId: z.uuid().nullable(),
  origin,
  label: z.string().trim().min(1).max(300),
  expectedPersonId: person,
  dueOn: optionalDate,
  status: z.enum(["open", "done", "not_applicable"]),
});

/**
 * A person's say on the next action: write their own (« Modifier »), set a
 * recommendation aside (« Sans objet »), or mark it done. Never a task: that
 * is createActivationTask, asked explicitly.
 */
export async function saveNextAction(
  input: z.input<typeof nextSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = nextSchema.safeParse(input);
  if (!parsed.success) return invalid(e.labelRequired);
  const v = parsed.data;
  const supabase = await createClient();
  const values = {
    label: v.label,
    expected_person_id: textOrNull(v.expectedPersonId),
    due_on: textOrNull(v.dueOn),
    status: v.status,
  };
  const { error } = v.rowId
    ? await supabase
        .from("activation_next_actions")
        .update(values)
        .eq("id", v.rowId)
    : await supabase.from("activation_next_actions").insert({
        ...values,
        activation_id: v.activationId,
        origin: v.origin,
        organization_id: access.organizationId ?? "",
        project_id: v.projectId,
      });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const taskSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  origin,
  label: z.string().trim().min(1).max(300),
  assigneePersonId: z.uuid(),
  dueDate: z.iso.date(),
});

/** « Créer une tâche » : only when asked, with whom and when. */
export async function createActivationTask(
  input: z.input<typeof taskSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalid(e.personRequired);
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_activation_task", {
    p_activation_id: v.activationId,
    p_origin: v.origin,
    p_label: v.label,
    p_assignee_person_id: v.assigneePersonId,
    p_due_date: v.dueDate,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}
