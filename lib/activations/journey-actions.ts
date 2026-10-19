"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationJourney;
const scope = { projectId: z.uuid(), activationId: z.uuid() };

/** One update of the activation's row, its result said for the journey. */
async function update(
  projectId: string,
  activationId: string,
  done: string,
  values: {
    owner_person_id?: string;
    due_on?: string;
    status?: string;
    status_reason?: string | null;
  },
): Promise<WriteResult> {
  return withOutcome(projectId, ["marketing"], done, async () => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("marketing_activations")
      .update(values)
      .eq("id", activationId);
    return error ? activationFailure(error) : activationDone(projectId);
  });
}

/** « Désigner » : the activation's owner, a member of PDS. */
export async function designateOwner(input: {
  projectId: string;
  activationId: string;
  personId: string;
}): Promise<WriteResult> {
  await requireApproved();
  const v = z.object({ ...scope, personId: z.uuid() }).safeParse(input);
  if (!v.success) return invalid(t.errors.owner);
  return update(v.data.projectId, v.data.activationId, t.done.designated, {
    owner_person_id: v.data.personId,
  });
}

/** « Fixer l'échéance ». */
export async function fixDue(input: {
  projectId: string;
  activationId: string;
  dueOn: string;
}): Promise<WriteResult> {
  await requireApproved();
  const v = z.object({ ...scope, dueOn: z.iso.date() }).safeParse(input);
  if (!v.success) return invalid(t.errors.dueRequired);
  return update(v.data.projectId, v.data.activationId, t.done.due, {
    due_on: v.data.dueOn,
  });
}

/** « Lancer l'activation », « Déclarer réalisée » : the database refuses
 * what is not ready (launch gaps, a campaign not begun). */
export async function moveActivation(input: {
  projectId: string;
  activationId: string;
  to: "in_progress" | "done_declared";
}): Promise<WriteResult> {
  await requireApproved();
  const v = z
    .object({ ...scope, to: z.enum(["in_progress", "done_declared"]) })
    .safeParse(input);
  if (!v.success) return invalid();
  return update(
    v.data.projectId,
    v.data.activationId,
    v.data.to === "in_progress" ? t.done.launched : t.done.declared,
    { status: v.data.to, status_reason: null },
  );
}

/** « Suspendre » / « Annuler l'activation » with a reason ; « Reprendre »
 * returns to the status the suspension kept (the database decides it). */
export async function setActivationLife(input: {
  projectId: string;
  activationId: string;
  action: "suspend" | "cancel" | "resume";
  reason: string;
}): Promise<WriteResult> {
  await requireApproved();
  const v = z
    .object({
      ...scope,
      action: z.enum(["suspend", "cancel", "resume"]),
      reason: z.string().max(1000),
    })
    .safeParse(input);
  if (!v.success) return invalid();
  const { projectId, activationId, action } = v.data;
  const reason = v.data.reason.trim();
  if (action !== "resume" && !reason)
    return invalid(fr.activations.errors.reasonRequired);
  if (action === "resume") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("marketing_activations")
      .select("status_before_suspension, status_reason")
      .eq("id", activationId)
      .single();
    if (!data?.status_before_suspension) return invalid();
    return update(projectId, activationId, t.done.resumed, {
      status: data.status_before_suspension,
      status_reason:
        data.status_before_suspension === "blocked" ? data.status_reason : null,
    });
  }
  return update(
    projectId,
    activationId,
    action === "suspend" ? t.done.suspended : t.done.cancelled,
    {
      status: action === "suspend" ? "suspended" : "cancelled",
      status_reason: reason,
    },
  );
}

/** « Sans objet » on the proof or the statistics: not expected any more,
 * with why (kept as the rule's set-aside next action). */
export async function markNotApplicable(input: {
  projectId: string;
  activationId: string;
  skip: "proof" | "stats";
  reason: string;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const v = z
    .object({
      ...scope,
      skip: z.enum(["proof", "stats"]),
      reason: z.string().trim().min(1).max(300),
    })
    .safeParse(input);
  if (!v.success) return invalid(t.errors.why);
  const { projectId, activationId, skip, reason } = v.data;
  return withOutcome(
    projectId,
    ["marketing"],
    t.done.notApplicable,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("marketing_activations")
        .update(
          skip === "proof"
            ? { evidence_expected: false }
            : { metrics_expected: false },
        )
        .eq("id", activationId);
      if (error) return activationFailure(error);
      const { error: noted } = await supabase
        .from("activation_next_actions")
        .insert({
          activation_id: activationId,
          origin:
            skip === "proof" ? "rule:evidence_missing" : "rule:metrics_missing",
          label: reason,
          status: "not_applicable",
          organization_id: access.organizationId ?? "",
          project_id: projectId,
        });
      return noted ? activationFailure(noted) : activationDone(projectId);
    },
  );
}

/** « Créer une tâche » for the next action's person, due with the
 * activation (or in a week when it has no date yet). */
export async function createNextTask(input: {
  projectId: string;
  activationId: string;
  rule: string;
  label: string;
  assigneePersonId: string;
  dueOn: string | null;
}): Promise<WriteResult> {
  await requireApproved();
  const v = z
    .object({
      ...scope,
      rule: z.string().regex(/^[a-z_]{1,60}$/),
      label: z.string().trim().min(1).max(300),
      assigneePersonId: z.uuid(),
      dueOn: z.iso.date().nullable(),
    })
    .safeParse(input);
  if (!v.success) return invalid(fr.activations.errors.personRequired);
  const d = v.data;
  const week = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_activation_task", {
    p_activation_id: d.activationId,
    p_origin: `rule:${d.rule}`,
    p_label: d.label,
    p_assignee_person_id: d.assigneePersonId,
    p_due_date: d.dueOn ?? week,
  });
  return error ? activationFailure(error) : activationDone(d.projectId);
}

/** « Marquer comme transmis » : the framing and the press kit sent to the
 * agency outside PDS OS, declared by a person. */
export async function declareTransmission(input: {
  projectId: string;
  activationId: string;
}): Promise<WriteResult> {
  await requireApproved();
  const v = z.object(scope).safeParse(input);
  if (!v.success) return invalid();
  return withOutcome(
    v.data.projectId,
    ["marketing"],
    t.done.transmitted,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("declare_activation_transmission", {
        p_activation_id: v.data.activationId,
      });
      return error
        ? activationFailure(error)
        : activationDone(v.data.projectId);
    },
  );
}
