"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  networkListRoutes,
  type NetworkListReply,
} from "@/lib/network/lists-types";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The gestures on the lists of the Réseau (Ibé, 18/11/2026). The database
// decides who may (a private list: its author alone; a shared one: its
// people kept up by every member who manages the Réseau, validated by the
// direction); these only check the shape of the input.

const idSchema = z.uuid();
const idsSchema = z.array(z.uuid()).max(500);
const nameSchema = z.string().trim().min(1).max(120);

type RpcError = { code?: string; message: string };

function listError(where: string, error: RpcError): string {
  const t = fr.network.lists.errors;
  const message = error.message;
  if (error.code === "42501") return t.forbidden;
  if (message.includes("list_not_found")) return t.notFound;
  if (message.includes("name_required")) return t.nameRequired;
  if (message.includes("name_too_long")) return t.nameTooLong;
  if (message.includes("contact_not_found")) return t.contactNotFound;
  if (message.includes("contact_not_in_list")) return t.notInList;
  if (message.includes("list_not_shared")) return t.notShared;
  console.error(`${where}:`, message);
  return t.failed;
}

function nameError(name: string): string {
  const t = fr.network.lists.errors;
  return name.trim() ? t.nameTooLong : t.nameRequired;
}

// « Mes listes » and every list's page.
function refresh() {
  revalidatePath(networkListRoutes.lists, "layout");
}

/** « Nouvelle liste », from « Mes listes » or the Réseau's selection: the
 * id of the new list. */
export async function createNetworkList(input: {
  name: string;
  shared: boolean;
  contactIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = fr.network.lists.errors;
  const access = await requireApproved();
  const name = nameSchema.safeParse(input.name);
  const contactIds = idsSchema.safeParse(input.contactIds);
  if (!name.success) return { ok: false, error: nameError(input.name) };
  if (!contactIds.success || !access.organizationId)
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_network_list", {
    p_organization_id: access.organizationId,
    p_name: name.data,
    p_shared: input.shared === true,
    p_contact_ids: contactIds.data,
  });
  if (error || !data)
    return {
      ok: false,
      error: error ? listError("createNetworkList", error) : t.failed,
    };
  refresh();
  return { ok: true, id: data };
}

/** « Ajouter à une liste » / « Ajouter des personnes »: those already in it
 * keep their place and their reply. */
export async function addContactsToNetworkList(input: {
  listId: string;
  listName: string;
  contactIds: string[];
}): Promise<WriteResult> {
  const t = fr.network.lists;
  await requireApproved();
  const listId = idSchema.safeParse(input.listId);
  const contactIds = idsSchema.min(1).safeParse(input.contactIds);
  if (!listId.success || !contactIds.success)
    return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_contacts_to_network_list", {
    p_list_id: listId.data,
    p_contact_ids: contactIds.data,
  });
  if (error)
    return { ok: false, error: listError("addContactsToNetworkList", error) };
  refresh();
  const added = data ?? 0;
  const done = t.addTo.done(added, input.listName);
  return added > 0 ? { ok: true, done } : { ok: true, notice: done };
}

/** « Retirer de la liste »: from this list only. */
export async function removeContactFromNetworkList(input: {
  listId: string;
  contactId: string;
}): Promise<WriteResult> {
  const t = fr.network.lists;
  await requireApproved();
  const listId = idSchema.safeParse(input.listId);
  const contactId = idSchema.safeParse(input.contactId);
  if (!listId.success || !contactId.success)
    return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_contact_from_network_list", {
    p_list_id: listId.data,
    p_contact_id: contactId.data,
  });
  if (error)
    return {
      ok: false,
      error: listError("removeContactFromNetworkList", error),
    };
  refresh();
  return { ok: true, done: t.people.removed };
}

/** The hourglass or the green tick, in one gesture. */
export async function setNetworkListReply(input: {
  listId: string;
  contactId: string;
  reply: NetworkListReply;
}): Promise<WriteResult> {
  const t = fr.network.lists;
  await requireApproved();
  const listId = idSchema.safeParse(input.listId);
  const contactId = idSchema.safeParse(input.contactId);
  const reply = z.enum(["waiting", "replied"]).safeParse(input.reply);
  if (!listId.success || !contactId.success || !reply.success)
    return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_network_list_reply", {
    p_list_id: listId.data,
    p_contact_id: contactId.data,
    p_reply: reply.data,
  });
  if (error)
    return { ok: false, error: listError("setNetworkListReply", error) };
  refresh();
  return { ok: true, done: t.replyDone[reply.data] };
}

/** « Renommer »: its author. */
export async function renameNetworkList(input: {
  listId: string;
  name: string;
}): Promise<WriteResult> {
  const t = fr.network.lists;
  await requireApproved();
  const listId = idSchema.safeParse(input.listId);
  const name = nameSchema.safeParse(input.name);
  if (!listId.success) return { ok: false, error: t.errors.failed };
  if (!name.success) return { ok: false, error: nameError(input.name) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_network_list", {
    p_list_id: listId.data,
    p_name: name.data,
  });
  if (error) return { ok: false, error: listError("renameNetworkList", error) };
  refresh();
  return { ok: true, done: t.rename.done };
}

/** « Partager avec l'équipe » / « Garder pour moi »: its author. */
export async function setNetworkListShared(input: {
  listId: string;
  shared: boolean;
}): Promise<WriteResult> {
  const t = fr.network.lists;
  await requireApproved();
  const listId = idSchema.safeParse(input.listId);
  if (!listId.success) return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_network_list_shared", {
    p_list_id: listId.data,
    p_shared: input.shared === true,
  });
  if (error)
    return { ok: false, error: listError("setNetworkListShared", error) };
  refresh();
  return { ok: true, done: input.shared ? t.share.onDone : t.share.offDone };
}

/** « Valider la liste » / « Retirer la validation »: the direction. */
export async function setNetworkListValidated(input: {
  listId: string;
  validated: boolean;
}): Promise<WriteResult> {
  const t = fr.network.lists;
  await requireApproved();
  const listId = idSchema.safeParse(input.listId);
  if (!listId.success) return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_network_list_validated", {
    p_list_id: listId.data,
    p_validated: input.validated === true,
  });
  if (error)
    return { ok: false, error: listError("setNetworkListValidated", error) };
  refresh();
  return {
    ok: true,
    done: input.validated ? t.validate.done : t.validate.undone,
  };
}

/** « Supprimer la liste »: its author; its people stay in the Réseau. Back
 * to « Mes listes » (redirected here: the deleted list's page would answer
 * 404 once revalidated). */
export async function deleteNetworkList(input: {
  listId: string;
}): Promise<WriteResult> {
  const t = fr.network.lists;
  await requireApproved();
  const listId = idSchema.safeParse(input.listId);
  if (!listId.success) return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_network_list", {
    p_list_id: listId.data,
  });
  if (error) return { ok: false, error: listError("deleteNetworkList", error) };
  refresh();
  redirect(networkListRoutes.lists);
}
