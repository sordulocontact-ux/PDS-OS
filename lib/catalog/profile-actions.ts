"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { getArtistPicturePath } from "@/lib/catalog/artist-queries";
import type { ContactFormState } from "@/lib/catalog/contacts";
import {
  ARTIST_PICTURE_BUCKET,
  isArtistPicturePath,
} from "@/lib/catalog/picture-rules";
import {
  catalogIdSchema,
  contactRefSchema,
  contactSchema,
  updateArtistSchema,
} from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Artist profile writes, with the user's session: RLS (manage_catalog) and
// column grants decide; the permission check only gives a clean message.

const UNIQUE_VIOLATION = "23505";

type Result = { ok: true } | { ok: false; error: string };

async function catalogAccess() {
  const access = await requireApproved();
  return access.organizationId && can(access, "manage_catalog")
    ? access.organizationId
    : null;
}

function refresh(artistId: string) {
  revalidatePath(routes.artist(artistId), "layout");
  revalidatePath(routes.artists);
}

export async function updateArtist(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await catalogAccess()))
    return { status: "error", formError: fr.auth.errors.forbidden };

  const parsed = parseForm(updateArtistSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }
  const { artistId, name, legalName, countryCode, bio, notes } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .update({
      name,
      legal_name: legalName,
      country_code: countryCode,
      bio,
      notes,
    })
    .eq("id", artistId)
    .select("id")
    .maybeSingle();

  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: { name: fr.catalog.artistForm.duplicate },
      values: retainedValues(formData),
    };
  }
  if (error || !data) {
    if (error) console.error("updateArtist:", error.message);
    return {
      status: "error",
      formError: error ? databaseErrorMessage(error) : fr.auth.errors.forbidden,
      values: retainedValues(formData),
    };
  }

  refresh(artistId);
  return { status: "success", message: fr.catalog.profileForm.saved };
}

export async function saveContact(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const organizationId = await catalogAccess();
  if (!organizationId)
    return { status: "error", formError: fr.auth.errors.forbidden };

  const parsed = parseForm(contactSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }
  const { artistId, contactId, role, name, email, phone, isPrimary } =
    parsed.data;
  const fields = { role, name, email, phone };

  const supabase = await createClient();
  const { error } = contactId
    ? await supabase
        .from("artist_contacts")
        // Unchecking "primary" does nothing: another contact takes the
        // place by being checked, never by leaving the artist without one.
        .update(isPrimary ? { ...fields, is_primary: true } : fields)
        .eq("id", contactId)
        .eq("artist_id", artistId)
    : await supabase.from("artist_contacts").insert({
        ...fields,
        organization_id: organizationId,
        artist_id: artistId,
        is_primary: isPrimary,
      });

  if (error) {
    console.error("saveContact:", error.message);
    return {
      status: "error",
      formError: databaseErrorMessage(error),
      values: retainedValues(formData),
    };
  }
  refresh(artistId);
  return { status: "saved" };
}

export async function deleteContact(input: {
  artistId: string;
  contactId: string;
}): Promise<Result> {
  const parsed = contactRefSchema.safeParse(input);
  if (!parsed.success || !(await catalogAccess()))
    return { ok: false, error: fr.auth.errors.forbidden };

  const supabase = await createClient();
  const { error } = await supabase
    .from("artist_contacts")
    .delete()
    .eq("id", parsed.data.contactId)
    .eq("artist_id", parsed.data.artistId);
  if (error) {
    console.error("deleteContact:", error.message);
    return { ok: false, error: fr.catalog.contacts.deleteFailed };
  }
  refresh(parsed.data.artistId);
  return { ok: true };
}

// The browser uploaded the file (storage RLS); this records it on the
// artist, then removes the picture it replaces.
export async function setArtistPicture(input: {
  artistId: string;
  path: string | null;
}): Promise<Result> {
  const organizationId = await catalogAccess();
  const artistId = catalogIdSchema.safeParse(input.artistId);
  if (!organizationId || !artistId.success)
    return { ok: false, error: fr.auth.errors.forbidden };
  if (
    input.path !== null &&
    !isArtistPicturePath(input.path, organizationId, artistId.data)
  ) {
    return { ok: false, error: fr.catalog.profileForm.picture.failed };
  }

  const previous = await getArtistPicturePath(artistId.data);
  const supabase = await createClient();
  const { error } = await supabase
    .from("artists")
    .update({ picture_path: input.path })
    .eq("id", artistId.data);
  if (error) {
    console.error("setArtistPicture:", error.message);
    return { ok: false, error: fr.catalog.profileForm.picture.failed };
  }
  if (previous && previous !== input.path) {
    const removed = await supabase.storage
      .from(ARTIST_PICTURE_BUCKET)
      .remove([previous]);
    if (removed.error)
      console.error("setArtistPicture (cleanup):", removed.error.message);
  }
  refresh(artistId.data);
  return { ok: true };
}
