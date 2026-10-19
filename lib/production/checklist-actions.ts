"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";
import { linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";

const t = fr.productionChecklist;

const holder = z
  .string()
  .regex(/^((person|contact):[0-9a-f-]{36})?$/)
  .transform((v) => {
    if (!v) return { person: null, contact: null };
    const [kind, id] = v.split(":");
    return kind === "person"
      ? { person: id, contact: null }
      : { person: null, contact: id };
  });

const addSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  title: z.string().trim().min(1).max(300),
  holder,
  due: z.iso.date().or(z.literal("")),
});

/** « Ajouter une tâche » to the checklist (whoever organises): a member
 * gets it in Travail when it has a date, a contact on its link. */
export async function addChecklistTask(
  input: z.input<typeof addSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.add.required };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_production_checklist_task", {
    p_sheet_id: p.sheetId,
    p_title: p.title,
    p_person_id: p.holder.person,
    p_contact_id: p.holder.contact,
    p_due_date: p.due || null,
  });
  if (error) return prepFailure(error);
  await schedulePendingPushes();
  return prepDone(p.projectId);
}

const finishSchema = z.object({
  projectId: z.uuid(),
  actionId: z.uuid(),
});

/** « Fait » in the step (its holder, or whoever organises). */
export async function finishChecklistTask(
  input: z.input<typeof finishSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  return withOutcome(p.projectId, ["marketing"], t.finished, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("finish_production_action", {
      p_action_id: p.actionId,
    });
    return error ? prepFailure(error) : prepDone(p.projectId);
  });
}

const linkSchema = z.object({
  token: z.string().regex(TOKEN),
  actionId: z.uuid(),
});

/** « Fait » on the company's link: one of its own tasks. */
export async function finishTaskByLink(
  input: z.input<typeof linkSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = linkSchema.safeParse(input);
  const e = fr.productionProvider.errors;
  if (!parsed.success) return { ok: false, error: e.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("finish_production_action_by_link", {
    ...linkKeyArgs(parsed.data.token),
    p_action_id: parsed.data.actionId,
  });
  if (error) {
    if (error.message.includes("link_closed"))
      return { ok: false, error: e.link_closed };
    if (error.message.includes("stage_locked"))
      return { ok: false, error: e.stage_locked };
    console.error("finishTaskByLink:", error.message);
    return { ok: false, error: e.failed };
  }
  revalidatePath(linkKeyPath("p", parsed.data.token));
  return { ok: true };
}
