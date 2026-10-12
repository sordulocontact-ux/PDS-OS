"use server";

import { revalidatePath } from "next/cache";

import { retainedValues } from "@/lib/auth/schemas";
import {
  afterWrite,
  parseMasterForm,
} from "@/lib/catalog/master/action-helpers";
import {
  SPLIT_KINDS,
  type MasterFormState,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import {
  declarationSchema,
  rightsSchema,
  splitSchema,
} from "@/lib/catalog/master/schemas";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
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
  const { masterId, itemId, partyRef, ...fields } = parsed.data;
  const [refKind, refId] = partyRef ? partyRef.split(":") : [null, null];
  const row = {
    ...fields,
    contact_id: refKind === "contact" ? refId : null,
    artist_id: refKind === "artist" ? refId : null,
  };
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
  const { masterId, organism, date, thirdParty, proofFileId, ...fields } =
    parsed.data;
  const row = {
    ...fields,
    declared_on: date,
    third_party: thirdParty,
    proof_file_id: proofFileId,
  };
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

/**
 * The title's files a declaration's proof may be (retour 60): the same
 * file as in its Fichiers tab, never deposited twice. Read with the user's
 * session (RLS hides what they may not read).
 */
export async function listDeclarationProofs(
  masterId: string,
): Promise<Array<{ id: string; name: string }>> {
  await requireApproved();
  const id = catalogIdSchema.safeParse(masterId);
  if (!id.success) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_files")
    .select("id, file_name")
    .eq("master_id", id.data)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("listDeclarationProofs:", error.message);
  return (data ?? []).map((f) => ({ id: f.id, name: f.file_name }));
}

/**
 * « Confirmer le titulaire du ℗ » (retours 54 and 58): a person confirms
 * the proposed holder and year; changing one of them later takes the
 * confirmation back (trigger). manage_catalog, active title (SQL).
 */
export async function confirmMasterRights(
  masterId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireApproved();
  const id = catalogIdSchema.safeParse(masterId);
  if (!id.success)
    return { ok: false, error: fr.masterPage.rights.confirmFailed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_master_rights", {
    p_master_id: id.data,
  });
  if (error) {
    if (!error.message.includes("rights_incomplete"))
      console.error("confirmMasterRights:", error.message);
    return {
      ok: false,
      error: error.message.includes("rights_incomplete")
        ? fr.masterPage.rights.confirmIncomplete
        : fr.masterPage.rights.confirmFailed,
    };
  }
  revalidatePath(routes.masterRights(id.data));
  return { ok: true };
}

/**
 * « Valider la répartition » (retours Catalogue 15, 44, 48): the legal side
 * takes a snapshot of a split at exactly 100 %; it stays the validated
 * version whatever changes after (validate_master_split).
 */
export async function validateMasterSplit(
  masterId: string,
  kind: SplitKind,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireApproved();
  const t = fr.masterPage.splits.review;
  if (
    !catalogIdSchema.safeParse(masterId).success ||
    !SPLIT_KINDS.includes(kind)
  )
    return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("validate_master_split", {
    p_master_id: masterId,
    p_kind: kind,
  });
  if (error) {
    if (error.message.includes("split_not_complete"))
      return { ok: false, error: t.notComplete };
    console.error("validateMasterSplit:", error.message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.masterCredits(masterId));
  return { ok: true };
}
