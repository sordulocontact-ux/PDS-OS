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
  NETWORK_ROLES,
  type NetworkContactValues,
  type NetworkFormOptions,
} from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

// Writes of the network, with the user's session: RLS (manage_network) and
// column grants decide; the permission check only gives a clean message.

export type SaveContactResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      field?: "name" | "roles" | "email" | "website";
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

const contactSchema = z.object({
  // Absent: a new contact.
  id: z.uuid().optional(),
  kind: z.enum(NETWORK_KINDS),
  name: z.string().trim().min(1).max(200),
  roles: z.array(z.enum(NETWORK_ROLES)).min(1).max(8),
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
});

function parseRoles(raw: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
}

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
    roles: parseRoles(form.get("roles")),
    parentId: form.get("parentId") ?? "",
    artistId: form.get("artistId") ?? "",
    email: form.get("email") ?? "",
    phone: form.get("phone") ?? "",
    website: form.get("website") ?? "",
    city: form.get("city") ?? "",
    notes: form.get("notes") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path[0];
    if (path === "roles")
      return {
        ok: false,
        error: fr.network.form.rolesRequired,
        field: "roles",
      };
    if (path === "email") return { ok: false, error: t.email, field: "email" };
    if (path === "website")
      return { ok: false, error: t.website, field: "website" };
    if (path === "name") return { ok: false, error: t.invalid, field: "name" };
    return { ok: false, error: t.invalid };
  }
  const { id, kind, ...values } = parsed.data;
  const row = {
    kind,
    name: values.name,
    roles: values.roles,
    // Only a person belongs to an organization.
    parent_id: kind === "person" ? values.parentId : null,
    artist_id: values.artistId,
    email: values.email,
    phone: values.phone,
    website: values.website,
    city: values.city,
    notes: values.notes,
  };

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase
        .from("network_contacts")
        .update(row)
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
    if (error) console.error("saveNetworkContact:", error.message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.network);
  revalidatePath(routes.networkContact(data.id));
  // A new contact opens on its page. Redirected here, not by the modal: on an
  // empty list, the button (and its modal) leaves the page with the refresh.
  if (!id) redirect(routes.networkContact(data.id));
  return { ok: true, id: data.id };
}

/**
 * What the "Modifier" modal needs, read when it opens: the contact as saved
 * and the form's choices. Null when the contact is gone or archived.
 */
export async function loadContactEdit(id: string): Promise<{
  contact: NetworkContactValues;
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
  return { contact, options };
}

/** The form's choices alone, for "Nouveau contact". */
export async function loadContactOptions(): Promise<NetworkFormOptions> {
  await requireApproved();
  return loadNetworkFormOptions();
}
