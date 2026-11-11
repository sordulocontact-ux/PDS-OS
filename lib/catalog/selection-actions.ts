"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The gestures on the selections of artists (lot 4 of docs/pds-mic-plan.md).
// The database decides who may (manage_catalog: the direction and the
// project managers) and to whom a selection can be handed; these only check
// the shape of the input.

const idSchema = z.uuid();
const idsSchema = z.array(z.uuid()).max(200);
const nameSchema = z.string().trim().min(1).max(120);

type RpcError = { code?: string; message: string };

function selectionError(where: string, error: RpcError): string {
  const t = fr.artistSelections.errors;
  const message = error.message;
  if (error.code === "42501") return fr.auth.errors.forbidden;
  if (message.includes("selection_not_found")) return t.notFound;
  if (message.includes("name_required")) return t.nameRequired;
  if (message.includes("name_too_long")) return t.nameTooLong;
  if (message.includes("artist_not_found")) return t.artistNotFound;
  if (message.includes("artist_not_in_selection")) return t.notInSelection;
  if (message.includes("recipient_not_allowed")) return t.recipientNotAllowed;
  if (message.includes("already_holder")) return t.alreadyHolder;
  console.error(`${where}:`, message);
  return t.failed;
}

function nameError(name: string): string {
  const t = fr.artistSelections.errors;
  return name.trim() ? t.nameTooLong : t.nameRequired;
}

// The list and every selection's page.
function refresh() {
  revalidatePath(routes.artistSelections, "layout");
}

/** « Nouvelle sélection »: its name and first artists; the id of the new
 * selection, whose page opens next. */
export async function createArtistSelection(input: {
  name: string;
  artistIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = fr.artistSelections.errors;
  const access = await requireApproved();
  const name = nameSchema.safeParse(input.name);
  const artistIds = idsSchema.safeParse(input.artistIds);
  if (!name.success) return { ok: false, error: nameError(input.name) };
  if (!artistIds.success || !access.organizationId)
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_artist_selection", {
    p_organization_id: access.organizationId,
    p_name: name.data,
    p_artist_ids: artistIds.data,
  });
  if (error || !data)
    return {
      ok: false,
      error: error ? selectionError("createArtistSelection", error) : t.failed,
    };
  refresh();
  return { ok: true, id: data };
}

/** « Renommer ». */
export async function renameArtistSelection(input: {
  selectionId: string;
  name: string;
}): Promise<WriteResult> {
  const t = fr.artistSelections.errors;
  await requireApproved();
  const selectionId = idSchema.safeParse(input.selectionId);
  const name = nameSchema.safeParse(input.name);
  if (!selectionId.success) return { ok: false, error: t.failed };
  if (!name.success) return { ok: false, error: nameError(input.name) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_artist_selection", {
    p_selection_id: selectionId.data,
    p_name: name.data,
  });
  if (error)
    return { ok: false, error: selectionError("renameArtistSelection", error) };
  refresh();
  return { ok: true };
}

/** « Ajouter des artistes »: at the end, those already in it skipped. */
export async function addArtistsToSelection(input: {
  selectionId: string;
  artistIds: string[];
}): Promise<WriteResult> {
  const t = fr.artistSelections;
  await requireApproved();
  const selectionId = idSchema.safeParse(input.selectionId);
  const artistIds = idsSchema.min(1).safeParse(input.artistIds);
  if (!selectionId.success) return { ok: false, error: t.errors.failed };
  if (!artistIds.success) return { ok: false, error: t.add.required };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_artists_to_selection", {
    p_selection_id: selectionId.data,
    p_artist_ids: artistIds.data,
  });
  if (error)
    return { ok: false, error: selectionError("addArtistsToSelection", error) };
  refresh();
  const added = data ?? 0;
  return added > 0
    ? { ok: true, done: t.add.done(added) }
    : { ok: true, notice: `${t.add.none}.` };
}

/** « Retirer de la sélection »: from this list only. */
export async function removeArtistFromSelection(input: {
  selectionId: string;
  artistId: string;
}): Promise<WriteResult> {
  const t = fr.artistSelections.errors;
  await requireApproved();
  const selectionId = idSchema.safeParse(input.selectionId);
  const artistId = idSchema.safeParse(input.artistId);
  if (!selectionId.success || !artistId.success)
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_artist_from_selection", {
    p_selection_id: selectionId.data,
    p_artist_id: artistId.data,
  });
  if (error)
    return {
      ok: false,
      error: selectionError("removeArtistFromSelection", error),
    };
  refresh();
  return { ok: true };
}

/** « Transmettre »: the recipient holds it, finds it in her selections and
 * is notified. */
export async function transmitArtistSelection(input: {
  selectionId: string;
  personId: string;
  personName: string;
}): Promise<WriteResult> {
  const t = fr.artistSelections;
  await requireApproved();
  const selectionId = idSchema.safeParse(input.selectionId);
  const personId = idSchema.safeParse(input.personId);
  if (!selectionId.success) return { ok: false, error: t.errors.failed };
  if (!personId.success) return { ok: false, error: t.transmit.required };

  const supabase = await createClient();
  const { error } = await supabase.rpc("transmit_artist_selection", {
    p_selection_id: selectionId.data,
    p_person_id: personId.data,
  });
  if (error)
    return {
      ok: false,
      error: selectionError("transmitArtistSelection", error),
    };
  await schedulePendingPushes();
  refresh();
  return { ok: true, done: t.transmit.done(input.personName) };
}
