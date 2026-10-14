import "server-only";

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { prepFailure, type PrepResult } from "@/lib/production/prep-result";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const e = fr.productionPreprod.errors;

export const invalid: PrepResult = {
  ok: false,
  error: fr.productionPrep.errors.invalid,
};
// No row written: RLS hid it (not the owner, or the stage no longer runs).
export const forbidden: PrepResult = {
  ok: false,
  error: fr.productionPrep.errors.forbidden,
};

/** The preproduction's own refusals first, then the preparation's. */
export function preprodFailure(error: {
  code?: string;
  message?: string;
}): PrepResult {
  const message = error.message ?? "";
  const known: [string, string][] = [
    ["checks_open", e.checksOpen],
    ["evidence_missing", e.evidenceMissing],
    ["proof_required", e.proofRequired],
    ["reason_required", e.reasonRequired],
    ["action_not_approved", e.actionNotApproved],
    ["task_already_created", e.taskAlreadyCreated],
    ["invalid_task", e.invalidTask],
    ["dependency_not_in_plan", e.dependency],
    ["call_not_of_sheet", e.callNotOfSheet],
    ["file_not_of_sheet", e.fileNotOfSheet],
    ["production_equipment_incident_check", e.incident],
    ["person_not_member", e.holder],
    ["contact_not_found", e.holder],
    ["action_not_found", fr.productionPrep.errors.notFound],
    ["not_consulted", fr.productionLocations.errors.not_consulted],
    ["location_discarded", fr.productionLocations.errors.location_discarded],
    ["location_chosen", fr.productionLocations.errors.location_chosen],
    [
      "location_not_verified",
      fr.productionLocations.errors.location_not_verified,
    ],
  ];
  const hit = known.find(([code]) => message.includes(code));
  if (hit) return { ok: false, error: hit[1] };
  return prepFailure(error);
}

/** Ends a write that changed rows; none changed means RLS hid them. */
export const changed = (rows: unknown[] | null): boolean =>
  (rows?.length ?? 0) > 0;

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value));

// "person:<uuid>" / "contact:<uuid>" / "" (nobody), as the selects send.
export const holderField = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "" || value === "none")
      return { person: null, contact: null };
    const [kind, id] = value.split(":");
    if (
      z.uuid().safeParse(id).success &&
      (kind === "person" || kind === "contact")
    )
      return kind === "person"
        ? { person: id, contact: null }
        : { person: null, contact: id };
    ctx.addIssue({ code: "custom", message: "holder" });
    return z.NEVER;
  });

/** The sheet's organization, when the sheet is in the project (and seen). */
export async function sheetOrg(
  supabase: Client,
  projectId: string,
  sheetId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("production_sheets")
    .select("organization_id")
    .eq("id", sheetId)
    .eq("project_id", projectId)
    .maybeSingle();
  return data?.organization_id ?? null;
}

/** The next position at the end of a sheet's list. */
export async function nextPosition(
  supabase: Client,
  table:
    | "production_call_items"
    | "production_plan_actions"
    | "production_equipment"
    | "production_budget_lines"
    | "production_location_options",
  sheetId: string,
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("position")
    .eq("sheet_id", sheetId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}
