"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { holderSchema } from "@/lib/production/post/result";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import {
  forbidden,
  invalid,
  nextPosition,
  preprodFailure,
  sheetOrg,
} from "./result";

// « Planifier » an action of the technical call's report (PROD-005): who
// does it and by when, then the action enters the plan approved and, for a
// member, becomes a task of Travail — once: an action already planned is
// updated, a task already created is never created again
// (create_production_task, production_plan_actions.item_id).

const schema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  itemId: z.uuid(),
  holder: holderSchema,
  dueDate: z.iso.date(),
});

export async function planCallAction(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  if (!p.holder.personId && !p.holder.contactId) return invalid;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, p.projectId, p.sheetId);
  if (!org) return forbidden;

  const { data: item } = await supabase
    .from("production_call_items")
    .select("id, body, kind, status")
    .eq("id", p.itemId)
    .eq("sheet_id", p.sheetId)
    .maybeSingle();
  if (!item || item.kind !== "action" || item.status === "rejected")
    return forbidden;
  // Planning a proposal of PO is confirming it.
  if (item.status === "proposed") {
    const { error } = await supabase
      .from("production_call_items")
      .update({ status: "confirmed" })
      .eq("id", item.id);
    if (error) return preprodFailure(error);
  }

  const fields = {
    person_id: p.holder.personId,
    contact_id: p.holder.contactId,
    due_date: p.dueDate,
  };
  const { data: existing } = await supabase
    .from("production_plan_actions")
    .select("id, task_id")
    .eq("sheet_id", p.sheetId)
    .eq("item_id", item.id)
    .maybeSingle();
  let actionId = existing?.id ?? null;
  if (actionId) {
    const { error } = await supabase
      .from("production_plan_actions")
      .update(fields)
      .eq("id", actionId);
    if (error) return preprodFailure(error);
  } else {
    const { data, error } = await supabase
      .from("production_plan_actions")
      .insert({
        ...fields,
        organization_id: org,
        project_id: p.projectId,
        sheet_id: p.sheetId,
        item_id: item.id,
        title: item.body.slice(0, 300),
        position: await nextPosition(
          supabase,
          "production_plan_actions",
          p.sheetId,
        ),
      })
      .select("id")
      .single();
    if (error || !data) return preprodFailure(error ?? {});
    actionId = data.id;
  }
  const { error: approveError } = await supabase
    .from("production_plan_actions")
    .update({ status: "approved" })
    .eq("id", actionId);
  if (approveError) return preprodFailure(approveError);

  if (p.holder.personId && !existing?.task_id) {
    const { error } = await supabase.rpc("create_production_task", {
      p_action_id: actionId,
      p_assignee_person_id: p.holder.personId,
      p_due_date: p.dueDate,
    });
    if (error) return preprodFailure(error);
    await schedulePendingPushes();
  }
  return prepDone(p.projectId);
}
