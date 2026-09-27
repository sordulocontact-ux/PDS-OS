"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { getMaster, masterOption } from "@/lib/catalog/queries";
import { catalogIdSchema, createMasterSchema } from "@/lib/catalog/schemas";
import type { CreateMasterState } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const updateMasterSchema = createMasterSchema.extend({
  masterId: catalogIdSchema,
});

const UNIQUE_VIOLATION = "23505";

// Edits a master and replaces its credits (update_master), with the user's
// session: RLS (manage_catalog) decides. Hands the saved master back, as
// createMaster does from a modal.
export async function updateMaster(
  _previous: CreateMasterState,
  formData: FormData,
): Promise<CreateMasterState> {
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "manage_catalog")) {
    return { status: "error", formError: fr.auth.errors.forbidden };
  }

  const values = retainedValues(formData);
  const parsed = parseForm(updateMasterSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values,
    };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_master", {
    p_master_id: input.masterId,
    p_title: input.title,
    p_credits: input.credits.map((c) => ({
      artist_id: c.artistId,
      role: c.role,
    })),
    p_variant: input.variant,
    p_variant_label: input.variantLabel ?? undefined,
    p_audio_state: input.audioState ?? undefined,
    p_isrc: input.isrc ?? undefined,
    p_duration_seconds: input.duration ?? undefined,
  });

  if (error) {
    const me = fr.catalog.masterForm.errors;
    if (error.code === UNIQUE_VIOLATION) {
      return { status: "error", fieldErrors: { isrc: me.isrcTaken }, values };
    }
    if (error.message.includes("master_requires_artist")) {
      return {
        status: "error",
        fieldErrors: { credits: me.artistsRequired },
        values,
      };
    }
    if (error.message.includes("master_not_editable")) {
      return { status: "error", formError: fr.auth.errors.forbidden, values };
    }
    console.error("updateMaster:", error.message);
    return { status: "error", formError: databaseErrorMessage(error), values };
  }

  revalidatePath(routes.app, "layout");
  const master = await getMaster(input.masterId);
  if (!master) return { status: "error", formError: fr.auth.errors.forbidden };
  return { status: "created", master: masterOption(master) };
}
