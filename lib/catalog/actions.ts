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
  masterOption,
} from "@/lib/catalog/queries";
import { createArtistSchema, createMasterSchema } from "@/lib/catalog/schemas";
import { DEFAULT_VARIANT } from "@/lib/catalog/title-rules";
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
      relation: parsed.data.relation,
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

  // Its main contact, given on the same screen: with the user's session
  // (artist_contacts: manage_catalog). The artist stays created if it
  // fails; the contact is added from its page.
  const contact = parsed.data;
  let contactFailed = false;
  if (contact.contactName) {
    const { error: contactError } = await supabase
      .from("artist_contacts")
      .insert({
        organization_id: access.organizationId,
        artist_id: data.id,
        role: contact.contactRole,
        name: contact.contactName,
        email: contact.contactEmail,
        phone: contact.contactPhone,
        contact_id: contact.contactNetworkContactId,
        is_primary: true,
      });
    if (contactError) {
      console.error("createArtist (contact):", contactError.message);
      contactFailed = true;
    }
  }

  // Lists and every form offering artists (master form, project form).
  revalidatePath(routes.app, "layout");
  return {
    status: "created",
    artist: data,
    organizationId: access.organizationId,
    contactFailed,
  };
}

// `intent=page` redirects to the new title; `intent=dialog` (from the
// project form) returns it so the form links it without losing its input;
// `intent=upload` returns it too, so the browser sends the chosen audio file
// to the new title before opening it. The file never travels here.
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
  // A variant created from its original is not an original (retour 08).
  if (input.variantOf && input.variant === DEFAULT_VARIANT) {
    return {
      status: "error",
      fieldErrors: { variant: fr.catalog.masterForm.errors.variantRequired },
      values,
    };
  }

  const supabase = await createClient();
  const { data: masterId, error } = await supabase.rpc("create_master", {
    p_organization_id: access.organizationId,
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
    p_contributors: input.contributors.map((c) => ({
      name: c.name,
      contact_id: c.contactId,
      roles: c.roles,
    })),
  });

  if (error || !masterId) {
    const me = fr.catalog.masterForm.errors;
    if (error?.message.includes("contributor_requires_role")) {
      return {
        status: "error",
        fieldErrors: {
          contributors: fr.catalog.masterForm.credits.invalid,
        },
        values,
      };
    }
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

  // A variant names its original (SQL checks it is one); a failure leaves
  // the title created, said rather than hidden.
  if (input.variantOf) {
    const linked = await supabase
      .from("masters")
      .update({ source_master_id: input.variantOf })
      .eq("id", masterId);
    if (linked.error)
      console.error("createMaster (variant source):", linked.error.message);
  }

  revalidatePath(routes.app, "layout");
  const intent = formData.get("intent");
  if (intent === "dialog" || intent === "upload") {
    const master = await getMaster(masterId);
    if (master) {
      return { status: "created", master: masterOption(master) };
    }
  }
  redirect(routes.master(masterId));
}
