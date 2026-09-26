"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import {
  findArtistByName,
  findArtistsByDeezerIds,
  getMaster,
} from "@/lib/catalog/queries";
import { createArtistSchema, createMasterSchema } from "@/lib/catalog/schemas";
import type { CreateArtistState, CreateMasterState } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { getDeezerArtist, type DeezerArtist } from "@/lib/integrations/deezer";
import { createClient } from "@/lib/supabase/server";

// Writes run with the user's session: RLS (manage_catalog) and column grants
// decide; the permission check here only gives a clean message.

const UNIQUE_VIOLATION = "23505";

export async function createArtist(
  _previous: CreateArtistState,
  formData: FormData,
): Promise<CreateArtistState> {
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "manage_catalog")) {
    return { status: "error", formError: fr.auth.errors.forbidden };
  }

  const parsed = parseForm(createArtistSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }

  // Picture and link come from Deezer itself, never from the form.
  const { deezerId } = parsed.data;
  let deezer: DeezerArtist | null = null;
  if (deezerId !== null) {
    deezer = await getDeezerArtist(deezerId).catch(() => null);
    if (!deezer) {
      return {
        status: "error",
        formError: fr.catalog.artistForm.deezerUnavailable,
        values: retainedValues(formData),
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .insert({
      organization_id: access.organizationId,
      name: parsed.data.name,
      notes: parsed.data.notes,
      deezer_id: deezer?.id ?? null,
      picture_url: deezer?.pictureBig ?? null,
      deezer_url: deezer?.link ?? null,
    })
    .select("id, name")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    const sameDeezer = error.message.includes("artists_org_deezer_key");
    const existing =
      sameDeezer && deezerId !== null
        ? (await findArtistsByDeezerIds([deezerId])).get(deezerId)
        : await findArtistByName(parsed.data.name);
    return {
      status: "error",
      fieldErrors: {
        name: sameDeezer
          ? fr.catalog.artistForm.deezerDuplicate
          : fr.catalog.artistForm.duplicate,
      },
      values: retainedValues(formData),
      existing: existing ?? undefined,
    };
  }
  if (error || !data) {
    console.error("createArtist:", error?.message);
    return {
      status: "error",
      formError: databaseErrorMessage(error),
      values: retainedValues(formData),
    };
  }

  // Lists and every form offering artists (master form, project form).
  revalidatePath(routes.app, "layout");
  return { status: "created", artist: data };
}

// `intent=page` redirects to the new master; `intent=dialog` (from the
// project form) returns it so the form links it without losing its input.
export async function createMaster(
  _previous: CreateMasterState,
  formData: FormData,
): Promise<CreateMasterState> {
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "manage_catalog")) {
    return { status: "error", formError: fr.auth.errors.forbidden };
  }

  const values = retainedValues(formData);
  const parsed = parseForm(createMasterSchema, formData);
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
  const { data: masterId, error } = await supabase.rpc("create_master", {
    p_organization_id: access.organizationId,
    p_title: input.title,
    p_credits: input.credits.map((c) => ({
      artist_id: c.artistId,
      role: c.role,
    })),
    p_version: input.version ?? undefined,
    p_isrc: input.isrc ?? undefined,
    p_duration_seconds: input.duration ?? undefined,
  });

  if (error || !masterId) {
    const me = fr.catalog.masterForm.errors;
    if (error?.code === UNIQUE_VIOLATION) {
      return { status: "error", fieldErrors: { isrc: me.isrcTaken }, values };
    }
    if (error?.message.includes("master_requires_artist")) {
      return {
        status: "error",
        fieldErrors: { credits: me.artistsRequired },
        values,
      };
    }
    console.error("createMaster:", error?.message);
    return { status: "error", formError: databaseErrorMessage(error), values };
  }

  revalidatePath(routes.app, "layout");
  if (formData.get("intent") === "dialog") {
    const master = await getMaster(masterId);
    if (master) {
      const { id, title, version, artists } = master;
      return { status: "created", master: { id, title, version, artists } };
    }
  }
  redirect(routes.master(masterId));
}
