"use server";

import { retainedValues } from "@/lib/auth/schemas";
import {
  afterWrite,
  parseMasterForm,
} from "@/lib/catalog/master/action-helpers";
import type { MasterFormState } from "@/lib/catalog/master/rules";
import {
  declarationSchema,
  rightsSchema,
  splitSchema,
} from "@/lib/catalog/master/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Splits, declarations and the rights of a master. RLS decides (splits and
// every write: manage_catalog; a live master only).

export async function saveSplit(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseMasterForm(splitSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { masterId, itemId, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = itemId
    ? await supabase
        .from("master_splits")
        .update(row)
        .eq("id", itemId)
        .eq("master_id", masterId)
    : await supabase.from("master_splits").insert({
        ...row,
        organization_id: parsed.organizationId,
        master_id: masterId,
      });
  // The total is checked by the database at commit: say it on the field.
  if (error?.message.includes("split_total_over_100")) {
    return {
      status: "error",
      fieldErrors: { share: fr.masterPage.splits.errors.overTotal },
      values: retainedValues(formData),
    };
  }
  return afterWrite("saveSplit", masterId, formData, error);
}

// One declaration per organism: edited in place once filed.
export async function saveDeclaration(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseMasterForm(declarationSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { masterId, organism, date, ...fields } = parsed.data;
  const row = { ...fields, declared_on: date };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("master_declarations")
    .select("id")
    .eq("master_id", masterId)
    .eq("organism", organism)
    .maybeSingle();
  const { error } = existing
    ? await supabase
        .from("master_declarations")
        .update(row)
        .eq("id", existing.id)
    : await supabase.from("master_declarations").insert({
        ...row,
        organization_id: parsed.organizationId,
        master_id: masterId,
        organism,
      });
  return afterWrite("saveDeclaration", masterId, formData, error);
}

export async function saveMasterRights(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseMasterForm(rightsSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { masterId, iswc, rightsHolder, rightsYear } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("masters")
    .update({
      iswc,
      rights_holder: rightsHolder,
      rights_year: rightsYear,
    })
    .eq("id", masterId)
    .select("id");
  // No row: archived meanwhile (RLS), nothing was written.
  if (!error && !data?.length) {
    return afterWrite(
      "saveMasterRights",
      masterId,
      formData,
      { message: "master_not_editable" },
      fr.masterPage.archivedNote,
    );
  }
  return afterWrite("saveMasterRights", masterId, formData, error);
}
