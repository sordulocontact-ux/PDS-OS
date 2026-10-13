"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Submission and handoff of a Fiche Livrable: each one a person's explicit
// action, checked by the database (submit_design_sheet, handoff_design_sheet).
// Decisions go through decideDesignDirection: the same
// decide_design_submission. Nothing is validated by silence, nothing reaches
// Production on its own.

const invalid: DesignResult = {
  ok: false,
  error: fr.conceptionSheet.errors.invalid,
};

export async function submitDesignSheet(
  projectId: string,
  sheetId: string,
  // MKT-C2-11: a message to the validators, the date expected.
  note: { message: string; dueOn: string } = { message: "", dueOn: "" },
): Promise<DesignResult> {
  const p = z
    .object({
      sheetId: z.uuid(),
      message: z.string().trim().max(2000),
      dueOn: z.union([z.literal(""), z.iso.date()]),
    })
    .safeParse({ sheetId, ...note });
  if (!p.success) return invalid;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_design_sheet", {
    p_sheet_id: p.data.sheetId,
    p_message: p.data.message || null,
    p_due_on: p.data.dueOn || null,
  });
  return designDone(projectId, error, "submitDesignSheet");
}

export async function handoffDesignSheet(
  projectId: string,
  sheetId: string,
): Promise<DesignResult> {
  if (!z.uuid().safeParse(sheetId).success) return invalid;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("handoff_design_sheet", {
    p_sheet_id: sheetId,
  });
  return designDone(projectId, error, "handoffDesignSheet");
}
