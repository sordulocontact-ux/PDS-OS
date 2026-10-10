"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const openSchema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  mode: z.enum(["direct", "call", "import"]),
});

/** « Commencer la préparation » (or « Changer » the mode): starts the stage
 * when needed, nothing leaves PDS OS. */
export async function openProductionSheet(
  input: z.input<typeof openSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = openSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_production_sheet", {
    p_deliverable_id: parsed.data.deliverableId,
    p_mode: parsed.data.mode,
  });
  return error ? prepFailure(error) : prepDone(parsed.data.projectId);
}

const directorSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  // "person:<uuid>", "contact:<uuid>" or "" to clear.
  holder: z.string().trim().max(80),
});

/** The owner designates the director: a member (who may then write the
 * brief) or a contact of the Réseau. */
export async function setProductionDirector(
  input: z.input<typeof directorSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = directorSchema.safeParse(input);
  const invalid = {
    ok: false as const,
    error: fr.productionPrep.errors.invalid,
  };
  if (!parsed.success) return invalid;
  let personId: string | null = null;
  let contactId: string | null = null;
  if (parsed.data.holder !== "") {
    const [kind, id] = parsed.data.holder.split(":");
    const holderId = z.uuid().safeParse(id);
    if (!holderId.success) return invalid;
    if (kind === "person") personId = holderId.data;
    else if (kind === "contact") contactId = holderId.data;
    else return invalid;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_production_director", {
    p_sheet_id: parsed.data.sheetId,
    p_person_id: personId,
    p_contact_id: contactId,
  });
  return error ? prepFailure(error) : prepDone(parsed.data.projectId);
}
