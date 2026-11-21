"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { privateDetailsOf } from "@/lib/network/private-details";
import {
  PARTICIPATION_ROLES,
  PARTICIPATION_STATUSES,
} from "@/lib/projects/participation-rules";
import { createClient } from "@/lib/supabase/server";
import type { WriteDone, WriteResult } from "@/lib/utils/write-result";

// The two gestures on the artists of a collective's titles
// (docs/pds-mic-plan.md, lot 3). The database decides who may (the owner
// once launched, who creates projects before: add_title_participation,
// set_title_participation_status), writes the credits of a confirmation
// and keeps the history; these only check the shape of the input. The
// recap (retours d'Ibé du 18/11/2026, lot 2) sets the interlocutor
// (contact_id) and the note, and writes the contact's number in the Réseau.

const idSchema = z.uuid();
const roleSchema = z.enum(PARTICIPATION_ROLES);
const statusSchema = z.enum(PARTICIPATION_STATUSES);

type RpcError = { code?: string; message: string };

function participationError(where: string, error: RpcError): string {
  const t = fr.projectTitles.participations.errors;
  const titles = fr.projectTitles.errors;
  const message = error.message;
  if (error.code === "42501") return fr.auth.errors.forbidden;
  if (message.includes("not_collective")) return titles.notCollective;
  if (
    message.includes("title_not_found") ||
    message.includes("project_not_found")
  )
    return titles.notFound;
  if (message.includes("participation_not_found")) return t.notFound;
  if (message.includes("title_abandoned")) return titles.abandoned;
  if (message.includes("participation_exists")) return t.exists;
  if (message.includes("main_artist_not_participant")) return t.mainArtist;
  if (message.includes("artist_not_found")) return t.artistNotFound;
  if (message.includes("contact_not_found")) return t.contactNotFound;
  if (message.includes("status_unchanged")) return t.unchanged;
  if (message.includes("note_too_long")) return t.noteTooLong;
  console.error(`${where}:`, message);
  return t.failed;
}

// The overview lists them, the Activité tells their history, an artist's
// page lists its collective projects, a credited title's page its credits.
function refresh(projectId: string, credited: boolean) {
  revalidatePath(routes.project(projectId), "layout");
  revalidatePath(routes.artists, "layout");
  if (credited) revalidatePath(routes.masters, "layout");
}

/** The toast of a gesture that credited the title in the Catalogue. */
function creditedDone(lead: string, count: number) {
  return count > 0
    ? fr.projectTitles.participations.credited(lead, count)
    : undefined;
}

/** « Ajouter un artiste » to a title: featured and proposed by default. */
export async function addTitleParticipation(input: {
  projectId: string;
  titleId: string;
  artistId: string;
  role: string;
  status: string;
}): Promise<WriteResult> {
  const t = fr.projectTitles.participations;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const titleId = idSchema.safeParse(input.titleId);
  const role = roleSchema.safeParse(input.role);
  const status = statusSchema.safeParse(input.status);
  if (
    !projectId.success ||
    !titleId.success ||
    !role.success ||
    !status.success
  )
    return { ok: false, error: t.errors.failed };
  const artistId = idSchema.safeParse(input.artistId);
  if (!artistId.success) return { ok: false, error: t.add.artistRequired };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_title_participation", {
    p_title_id: titleId.data,
    p_artist_id: artistId.data,
    p_role: role.data,
    p_status: status.data,
  });
  if (error)
    return {
      ok: false,
      error: participationError("addTitleParticipation", error),
    };
  const credited = data?.[0]?.credited ?? 0;
  refresh(projectId.data, credited > 0);
  return { ok: true, done: creditedDone(t.addedLead, credited) };
}

/** « Changer le statut » of a participation: declined or withdrawn, it
 * stays; confirmed, the title is credited. */
export async function setTitleParticipationStatus(input: {
  projectId: string;
  participationId: string;
  status: string;
}): Promise<WriteResult> {
  const t = fr.projectTitles.participations;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const participationId = idSchema.safeParse(input.participationId);
  const status = statusSchema.safeParse(input.status);
  if (!projectId.success || !participationId.success || !status.success)
    return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_title_participation_status", {
    p_participation_id: participationId.data,
    p_status: status.data,
  });
  if (error)
    return {
      ok: false,
      error: participationError("setTitleParticipationStatus", error),
    };
  const credited = data ?? 0;
  refresh(projectId.data, credited > 0);
  return {
    ok: true,
    done:
      creditedDone(t.confirmedLead, credited) ??
      t.status.changed(t.statuses[status.data]),
  };
}

// ------------------------------------------------------------------ Recap
// The recap's gestures (retours d'Ibé du 18/11/2026, lot 2): the
// participation's contact and note (set_title_participation_contact /
// _note: who writes the titles), the contact's number in the Réseau (with
// the user's session: RLS manage_network, a private contact's coordinates
// by set_private_contact_details). No contact is read by a SECURITY
// DEFINER function (décision 5).

const noteSchema = z.string().max(2000).nullable();
const contactNameSchema = z.string().trim().min(1).max(200);
// Blank: no number (null), as the Réseau stores it.
const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .transform((value) => value || null);

// The overview and « Titres et artistes » show the contact; the Réseau
// lists it and its page.
function refreshContact(projectId: string, contactId: string) {
  refresh(projectId, false);
  revalidatePath(routes.network);
  revalidatePath(routes.networkContact(contactId));
}

/** The participation's interlocutor (the artist's manager), a contact of
 * the Réseau; null removes it (the Catalogue's manager shows again). */
export async function setParticipationContact(input: {
  projectId: string;
  participationId: string;
  contactId: string | null;
}): Promise<WriteResult> {
  const t = fr.projectTitles.participations.errors;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const participationId = idSchema.safeParse(input.participationId);
  const contactId = idSchema.nullable().safeParse(input.contactId || null);
  if (!projectId.success || !participationId.success || !contactId.success)
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_title_participation_contact", {
    p_participation_id: participationId.data,
    p_contact_id: contactId.data,
  });
  if (error)
    return {
      ok: false,
      error: participationError("setParticipationContact", error),
    };
  refresh(projectId.data, false);
  return { ok: true };
}

/**
 * « Nouveau contact » from the recap: a contact of the Réseau (shared, a
 * person, « Manager »), created with the user's session (manage_network),
 * then set as the participation's interlocutor. The right to write the
 * participation is checked first, so that a refusal leaves no contact
 * behind.
 */
export async function createParticipationContact(input: {
  projectId: string;
  participationId: string;
  name: string;
  phone: string;
}): Promise<
  (WriteDone & { contactId: string }) | { ok: false; error: string }
> {
  const t = fr.projectTitles.participations.errors;
  const r = fr.projectTitles.recap.errors;
  const access = await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const participationId = idSchema.safeParse(input.participationId);
  if (!projectId.success || !participationId.success)
    return { ok: false, error: t.failed };
  if (!access.organizationId || !can(access, "manage_network"))
    return { ok: false, error: r.networkForbidden };
  const name = contactNameSchema.safeParse(input.name);
  if (!name.success)
    return {
      ok: false,
      error: input.name.trim() ? r.nameTooLong : r.nameRequired,
    };
  const phone = phoneSchema.safeParse(input.phone);
  if (!phone.success) return { ok: false, error: r.phoneTooLong };

  const supabase = await createClient();
  // Rewriting the interlocutor it has checks who may write it, and that
  // its title is not abandoned (lock_title_participation), changing nothing.
  const { data: current } = await supabase
    .from("title_participations")
    .select("contact_id")
    .eq("id", participationId.data)
    .maybeSingle();
  if (!current) return { ok: false, error: t.notFound };
  const check = await supabase.rpc("set_title_participation_contact", {
    p_participation_id: participationId.data,
    p_contact_id: current.contact_id,
  });
  if (check.error)
    return {
      ok: false,
      error: participationError("createParticipationContact", check.error),
    };

  const { data: contact, error } = await supabase
    .from("network_contacts")
    .insert({
      organization_id: access.organizationId,
      kind: "person",
      name: name.data,
      phone: phone.data,
      roles: ["manager"],
    })
    .select("id")
    .single();
  if (error || !contact) {
    if (error?.code === "42501")
      return { ok: false, error: r.networkForbidden };
    if (error) console.error("createParticipationContact:", error.message);
    return { ok: false, error: r.failed };
  }
  const { error: setError } = await supabase.rpc(
    "set_title_participation_contact",
    { p_participation_id: participationId.data, p_contact_id: contact.id },
  );
  if (setError)
    return {
      ok: false,
      error: participationError("createParticipationContact", setError),
    };
  refreshContact(projectId.data, contact.id);
  return { ok: true, contactId: contact.id };
}

/**
 * The contact's number, changed in the Réseau (« changer le numéro ici le
 * change dans le Réseau »): a shared contact's network_contacts.phone (RLS
 * manage_network); a private contact's private details, its other
 * coordinates kept (set_private_contact_details: its owner and the
 * direction). Blank removes the number.
 */
export async function setContactPhone(input: {
  projectId: string;
  contactId: string;
  phone: string;
}): Promise<WriteResult> {
  const r = fr.projectTitles.recap;
  const access = await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const contactId = idSchema.safeParse(input.contactId);
  if (!projectId.success || !contactId.success)
    return { ok: false, error: r.errors.failed };
  if (!can(access, "manage_network"))
    return { ok: false, error: r.errors.networkForbidden };
  const phone = phoneSchema.safeParse(input.phone);
  if (!phone.success) return { ok: false, error: r.errors.phoneTooLong };

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("network_contacts")
    .select("id, private_owner_person_id, archived_at")
    .eq("id", contactId.data)
    .maybeSingle();
  if (!contact || contact.archived_at)
    return { ok: false, error: r.errors.contactNotFound };

  if (contact.private_owner_person_id) {
    const { data: canRead } = await supabase.rpc("can_read_contact_details", {
      p_contact_id: contact.id,
    });
    if (canRead !== true) return { ok: false, error: r.errors.phonePrivate };
    const kept = (await privateDetailsOf(supabase, [contact.id])).get(
      contact.id,
    );
    const { error } = await supabase.rpc("set_private_contact_details", {
      p_contact_id: contact.id,
      p_email: kept?.email ?? null,
      p_phone: phone.data,
      p_city: kept?.city ?? null,
      p_notes: kept?.notes ?? null,
    });
    if (error) {
      if (error.code === "42501")
        return { ok: false, error: r.errors.phonePrivate };
      console.error("setContactPhone private:", error.message);
      return { ok: false, error: r.errors.failed };
    }
  } else {
    const { data, error } = await supabase
      .from("network_contacts")
      .update({ phone: phone.data })
      .eq("id", contact.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("setContactPhone:", error.message);
      return {
        ok: false,
        error: error ? r.errors.failed : r.errors.networkForbidden,
      };
    }
  }
  refreshContact(projectId.data, contact.id);
  return { ok: true, done: r.phoneChanged };
}

/** The participation's note: free, 2 000 characters at most; blank
 * removes it. */
export async function setParticipationNote(input: {
  projectId: string;
  participationId: string;
  note: string | null;
}): Promise<WriteResult> {
  const t = fr.projectTitles.participations.errors;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const participationId = idSchema.safeParse(input.participationId);
  if (!projectId.success || !participationId.success)
    return { ok: false, error: t.failed };
  const note = noteSchema.safeParse(input.note);
  if (!note.success) return { ok: false, error: t.noteTooLong };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_title_participation_note", {
    p_participation_id: participationId.data,
    p_note: note.data,
  });
  if (error)
    return {
      ok: false,
      error: participationError("setParticipationNote", error),
    };
  refresh(projectId.data, false);
  return { ok: true };
}
