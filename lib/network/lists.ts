import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import {
  asNetworkListReply,
  networkListStateOf,
  type NetworkListDetail,
  type NetworkListItem,
  type NetworkListOption,
} from "@/lib/network/lists-types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Lists of contacts of the Réseau (Ibé, 18/11/2026), read with the viewer's
// session: RLS gives a private list to its author alone and a shared one to
// every active member. A list holds contact ids only: the contacts are read
// apart, under their own rules (a private contact's coordinates never come
// through a list). An archived contact is kept but neither shown nor
// counted.

type Owner = { first_name: string | null; last_name: string | null } | null;

const LIST_SELECT =
  "id, name, shared, validated_at, owner_person_id, updated_at, owner:people!network_lists_owner_person_id_fkey(first_name, last_name), network_list_contacts(contact_id, reply)";

const ownerOf = (id: string, owner: Owner) => ({
  personId: id,
  name: owner ? personName(owner.first_name, owner.last_name) : "",
});

/** Every list the viewer reads, most recently changed first. */
export async function listNetworkLists(): Promise<{
  lists: NetworkListItem[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_lists")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("listNetworkLists:", error.message);
    return { lists: [], error: true };
  }
  const ids = [
    ...new Set(
      data.flatMap((l) => l.network_list_contacts.map((c) => c.contact_id)),
    ),
  ];
  const { data: contacts, error: contactsError } = ids.length
    ? await supabase
        .from("network_contacts")
        .select("id, name")
        .in("id", ids)
        .is("archived_at", null)
    : { data: [], error: null };
  if (contactsError)
    console.error("listNetworkLists contacts:", contactsError.message);
  const names = new Map((contacts ?? []).map((c) => [c.id, c.name]));
  return {
    error: false,
    lists: data.map((l) => {
      const live = l.network_list_contacts.filter((c) =>
        names.has(c.contact_id),
      );
      return {
        id: l.id,
        name: l.name,
        state: networkListStateOf({
          shared: l.shared,
          validatedAt: l.validated_at,
        }),
        owner: ownerOf(l.owner_person_id, l.owner),
        contactNames: live
          .map((c) => names.get(c.contact_id) ?? "")
          .sort((a, b) => a.localeCompare(b, "fr")),
        replied: live.filter((c) => c.reply === "replied").length,
        updatedAt: l.updated_at,
      };
    }),
  };
}

/** The lists people can be added to (« Ajouter à une liste »): every list
 * the viewer reads, for who manages the Réseau (theirs, and the shared). */
export async function listNetworkListOptions(): Promise<NetworkListOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_lists")
    .select("id, name, shared, validated_at")
    .order("updated_at", { ascending: false });
  if (error) console.error("listNetworkListOptions:", error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    state: networkListStateOf({
      shared: l.shared,
      validatedAt: l.validated_at,
    }),
  }));
}

/** One list and its people with their reply; null when not readable. */
export const getNetworkList = trackedCache(async function getNetworkList(
  id: string,
): Promise<NetworkListDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_lists")
    .select(LIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    // A malformed id reads as « not found ».
    if (error.code !== "22P02") console.error("getNetworkList:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    shared: data.shared,
    state: networkListStateOf({
      shared: data.shared,
      validatedAt: data.validated_at,
    }),
    owner: ownerOf(data.owner_person_id, data.owner),
    members: data.network_list_contacts.map((c) => ({
      contactId: c.contact_id,
      reply: asNetworkListReply(c.reply),
    })),
  };
});
