"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Designations of the Conception (ticket § 5): only the project owner
// designates a responsible or names validators; the database checks it
// (assign_design_responsible, set_design_validators). PO only suggests.

const scope = z.enum(["direction", "sheet"]);
const id = z.uuid();

function invalid(): DesignResult {
  return { ok: false, error: fr.conception.errors.invalid };
}

/** « Désigner »: the previous responsible of the scope is replaced. */
export async function assignDesignResponsible(
  projectId: string,
  target: "direction" | "sheet",
  sheetId: string | null,
  personId: string,
): Promise<DesignResult> {
  if (
    !id.safeParse(projectId).success ||
    !scope.safeParse(target).success ||
    !id.safeParse(personId).success ||
    (target === "sheet") !== id.safeParse(sheetId).success
  )
    return invalid();
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_design_responsible", {
    p_project_id: projectId,
    p_scope: target,
    p_sheet_id: target === "sheet" ? sheetId : null,
    p_person_id: personId,
  });
  return designDone(projectId, error, "assignDesignResponsible");
}

/** The validators of a scope, replaced as a whole. */
export async function setDesignValidators(
  projectId: string,
  target: "direction" | "sheet",
  sheetId: string | null,
  personIds: string[],
): Promise<DesignResult> {
  const people = z.array(id).max(10).safeParse(personIds);
  if (
    !id.safeParse(projectId).success ||
    !scope.safeParse(target).success ||
    !people.success ||
    (target === "sheet") !== id.safeParse(sheetId).success
  )
    return invalid();
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_design_validators", {
    p_project_id: projectId,
    p_scope: target,
    p_sheet_id: target === "sheet" ? sheetId : null,
    p_people: [...new Set(people.data)],
  });
  return designDone(projectId, error, "setDesignValidators");
}

/** Global (one decision per version) or per section. */
export async function setDesignValidationMode(
  projectId: string,
  mode: "global" | "per_section",
): Promise<DesignResult> {
  if (
    !id.safeParse(projectId).success ||
    !z.enum(["global", "per_section"]).safeParse(mode).success
  )
    return invalid();
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_design_validation_mode", {
    p_project_id: projectId,
    p_mode: mode,
  });
  return designDone(projectId, error, "setDesignValidationMode");
}
