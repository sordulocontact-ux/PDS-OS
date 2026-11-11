"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  getNetworkContact,
  loadNetworkFormOptions,
} from "@/lib/network/queries";
import {
  NETWORK_KINDS,
  NETWORK_RELATIONS,
  NETWORK_ROLES,
  type NetworkContactValues,
  type NetworkFormOptions,
} from "@/lib/network/types";
import { linkCreditsOfNewContact } from "@/lib/network/link-credits";
import {
  pictureFileOf,
  pictureStateOf,
  updateContactPicture,
} from "@/lib/network/pictures";
import {
  parseDeezerId,
  parseHandle,
  parseSpotifyId,
} from "@/lib/network/socials";
import { createClient } from "@/lib/supabase/server";
import { jsonListOf } from "@/lib/utils/form-data";

// Writes of the network, with the user's session: RLS (manage_network) and
// column grants decide; the permission check only gives a clean message.

export type SaveContactResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      field?: SocialField | "name" | "roles" | "email" | "website" | "picture";
    };

// Blank means none (null), as the database wants it.
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const noneOrId = z
  .union([z.uuid(), z.literal(""), z.literal("none")])
  .transform((value) => (value === "none" || value === "" ? null : value));

type SocialField = "tiktok" | "instagram" | "spotify" | "deezer";

// An account typed as "@handle", an id or a pasted profile link; blank =
// none, anything else unreadable = refused with its field.
const account = <T>(parse: (value: string) => T | null) =>
  z
    .string()
    .trim()
    .max(500)
    .transform((value, ctx) => {
      if (!value) return null;
      const parsed = parse(value);
      if (parsed === null) ctx.addIssue({ code: "custom", message: "account" });
      return parsed;
    });

const contactSchema = z.object({
  // Absent: a new contact.
  id: z.uuid().optional(),
  kind: z.enum(NETWORK_KINDS),
  name: z.string().trim().min(1).max(200),
  // Only the kind and the name are required (ticket of 11/10/2026).
  roles: z.array(z.enum(NETWORK_ROLES)).max(8),
  relations: z.array(z.enum(NETWORK_RELATIONS)).max(4),
  // "none": the select's "Aucune" choice.
  parentId: noneOrId,
  artistId: noneOrId,
  email: optional(320).refine(
    (value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
    "email",
  ),
  phone: optional(40),
  website: optional(500).refine(
    (value) => value === null || /^https?:\/\//.test(value),
    "website",
  ),
  city: optional(120),
  notes: optional(2000),
  tiktok: account((v) => parseHandle(v, "tiktok.com")),
  instagram: account((v) => parseHandle(v, "instagram.com")),
  spotify: account(parseSpotifyId),
  deezer: account(parseDeezerId),
});

const SOCIAL_FIELDS: readonly SocialField[] = [
  "tiktok",
  "instagram",
  "spotify",
  "deezer",
];

/** Creates or updates a contact from the contact form. */
export async function saveNetworkContact(
  _previous: SaveContactResult | null,
  form: FormData,
): Promise<SaveContactResult> {
  const t = fr.network.errors;
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "manage_network"))
    return { ok: false, error: t.forbidden };

  const parsed = contactSchema.safeParse({
    id: form.get("id") || undefined,
    kind: form.get("kind"),
    name: form.get("name") ?? "",
    roles: jsonListOf(form.get("roles")),
    relations: jsonListOf(form.get("relations")),
    parentId: form.get("parentId") ?? "",
    artistId: form.get("artistId") ?? "",
    email: form.get("email") ?? "",
    phone: form.get("phone") ?? "",
    website: form.get("website") ?? "",
    city: form.get("city") ?? "",
    notes: form.get("notes") ?? "",
    tiktok: form.get("tiktok") ?? "",
    instagram: form.get("instagram") ?? "",
    spotify: form.get("spotify") ?? "",
    deezer: form.get("deezer") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path[0];
    if (path === "roles" || path === "relations")
      return { ok: false, error: t.invalid };
    if (path === "email") return { ok: false, error: t.email, field: "email" };
    if (path === "website")
      return { ok: false, error: t.website, field: "website" };
    if (path === "name") return { ok: false, error: t.invalid, field: "name" };
    const social = SOCIAL_FIELDS.find((field) => field === path);
    if (social) return { ok: false, error: t.accounts[social], field: social };
    return { ok: false, error: t.invalid };
  }
  const picture = pictureFileOf(form);
  if (picture === "invalid")
    return { ok: false, error: t.picture, field: "picture" };
  const { id, kind, ...values } = parsed.data;
  const row = {
    kind,
    name: values.name,
    roles: [...new Set(values.roles)],
    relations: [...new Set(values.relations)],
    // Only a person belongs to an organization, or stands for a catalog
    // artist (the form says so before a change of kind).
    parent_id: kind === "person" ? values.parentId : null,
    artist_id: kind === "person" ? values.artistId : null,
    email: values.email,
    phone: values.phone,
    website: values.website,
    city: values.city,
    notes: values.notes,
    tiktok_handle: values.tiktok,
    instagram_handle: values.instagram,
    spotify_artist_id: values.spotify,
    deezer_artist_id: values.deezer,
  };

  const supabase = await createClient();
  const before = id ? await pictureStateOf(supabase, id) : null;
  // A private contact (BIZ 8): its coordinates are written apart, by whoever
  // may read them; anyone else's are not kept.
  const privacy = id ? await privateEdit(supabase, id) : null;
  const { email, phone, city, notes, ...shared } = row;
  const { data, error } = id
    ? await supabase
        .from("network_contacts")
        .update(privacy?.isPrivate ? shared : row)
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("network_contacts")
        .insert({ ...row, organization_id: access.organizationId })
        .select("id")
        .single();
  if (error || !data) {
    if (error?.message.includes("network_parent_not_organization"))
      return { ok: false, error: t.parent };
    if (error?.message.includes("network_organization_has_members"))
      return { ok: false, error: t.members };
    if (error) console.error("saveNetworkContact:", error.message);
    return { ok: false, error: t.failed };
  }
  if (privacy?.isPrivate && privacy.canRead) {
    const { error: privateError } = await supabase.rpc(
      "set_private_contact_details",
      {
        p_contact_id: data.id,
        p_email: email,
        p_phone: phone,
        p_city: city,
        p_notes: notes,
      },
    );
    if (privateError) {
      console.error("saveNetworkContact private:", privateError.message);
      return { ok: false, error: t.failed };
    }
  }
  // Its picture, once it exists: a failed file of an existing contact is
  // said (a new one opens anyway; « Modifier » adds it again).
  const pictured = await updateContactPicture(supabase, {
    organizationId: access.organizationId,
    contactId: data.id,
    before,
    accounts: {
      spotify: values.spotify,
      deezer: values.deezer?.toString() ?? null,
      tiktok: values.tiktok,
      instagram: values.instagram,
    },
    upload: picture,
    remove: form.get("pictureRemove") === "1",
  });
  if (!pictured && id) return { ok: false, error: t.picture, field: "picture" };
  // A new contact takes the unlinked credits of its exact name.
  if (!id)
    await linkCreditsOfNewContact(supabase, access, {
      id: data.id,
      name: values.name,
    });
  revalidatePath(routes.network);
  revalidatePath(routes.networkContact(data.id));
  // A new contact opens on its page. Redirected here, not by the modal: on an
  // empty list, the button (and its modal) leaves the page with the refresh.
  // `stay`: added from another page (Juridique), which refreshes itself.
  if (!id && form.get("stay") !== "1") redirect(routes.networkContact(data.id));
  return { ok: true, id: data.id };
}

/**
 * What the "Modifier" modal needs, read when it opens: the contact as saved
 * and the form's choices. Null when the contact is gone or archived.
 */
export async function loadContactEdit(id: string): Promise<{
  // memberCount: an organization with people attached stays one.
  contact: NetworkContactValues & {
    memberCount: number;
    coordinatesHidden: boolean;
  };
  options: NetworkFormOptions;
} | null> {
  const access = await requireApproved();
  if (!can(access, "manage_network") || !z.uuid().safeParse(id).success)
    return null;
  const [contact, options] = await Promise.all([
    getNetworkContact(id),
    loadNetworkFormOptions(),
  ]);
  if (!contact || contact.archived) return null;
  return {
    contact: {
      ...contact,
      memberCount: contact.members.length,
      coordinatesHidden: contact.privacy.hidden,
    },
    options,
  };
}

/** The form's choices alone, for "Nouveau contact". */
export async function loadContactOptions(): Promise<NetworkFormOptions> {
  await requireApproved();
  return loadNetworkFormOptions();
}

/** Whether a contact is private and its coordinates readable (BIZ 8). */
async function privateEdit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<{ isPrivate: boolean; canRead: boolean }> {
  const [{ data }, { data: canRead }] = await Promise.all([
    supabase
      .from("network_contacts")
      .select("private_owner_person_id")
      .eq("id", id)
      .maybeSingle(),
    supabase.rpc("can_read_contact_details", { p_contact_id: id }),
  ]);
  return {
    isPrivate: Boolean(data?.private_owner_person_id),
    canRead: canRead === true,
  };
}
