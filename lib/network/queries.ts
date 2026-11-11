import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import {
  networkRelationsOf,
  networkRolesOf,
  type NetworkContactRow,
  type NetworkContactValues,
  type NetworkFormOptions,
  type NetworkKind,
} from "@/lib/network/types";
import { networkPictureSourceOf } from "@/lib/network/picture-rules";
import { signNetworkPictures } from "@/lib/network/pictures";
import { asHandle } from "@/lib/network/socials";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/projects/types";
import { withPrivateDetails } from "@/lib/network/private-details";

// Read side of the network, with the viewer's session (RLS: every active
// member reads it).

const kindOf = (value: string): NetworkKind =>
  value === "organization" ? "organization" : "person";

type Client = Awaited<ReturnType<typeof createClient>>;

// Names of the organizations some contacts belong to (a self-reference,
// read apart rather than embedded).
async function parentNames(
  supabase: Client,
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
  if (wanted.length === 0) return new Map();
  const { data, error } = await supabase
    .from("network_contacts")
    .select("id, name")
    .in("id", wanted);
  if (error) console.error("parentNames:", error.message);
  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

// A team of 3 to 5 people stays far below it.
const LIST_LIMIT = 1000;

/** Live contacts, or the archive (`archived`), by name. Null on failure. */
export async function listNetworkContacts(
  archived: boolean,
): Promise<NetworkContactRow[] | null> {
  const supabase = await createClient();
  const query = supabase
    .from("network_contacts")
    .select(
      "id, kind, name, roles, relations, email, phone, city, parent_id, artist_id, tiktok_handle, picture_path, private_owner_person_id",
    )
    .order("name")
    .limit(LIST_LIMIT);
  const { data: raw, error } = await (archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null));
  if (error) {
    console.error("listNetworkContacts:", error.message);
    return null;
  }
  // A private contact's coordinates, for whoever may read them (BIZ 8).
  const { rows: data } = await withPrivateDetails(supabase, raw);
  const [parents, pictures] = await Promise.all([
    parentNames(
      supabase,
      data.map((row) => row.parent_id),
    ),
    signNetworkPictures(
      data.flatMap((row) => (row.picture_path ? [row.picture_path] : [])),
    ),
  ]);
  return data.map((row) => ({
    id: row.id,
    kind: kindOf(row.kind),
    name: row.name,
    roles: networkRolesOf(row.roles),
    relations: networkRelationsOf(row.relations),
    parentName: row.parent_id ? (parents.get(row.parent_id) ?? null) : null,
    artistId: row.artist_id,
    email: row.email,
    phone: row.phone,
    city: row.city,
    tiktok: row.tiktok_handle,
    pictureUrl: row.picture_path
      ? (pictures.get(row.picture_path) ?? null)
      : null,
  }));
}

export type NetworkContactDetail = NetworkContactValues & {
  archived: boolean;
  // BIZ 8: a private contact's owner (null: shared), who created it (may
  // make it private), and whether its coordinates are hidden from the reader.
  privacy: {
    ownerId: string | null;
    ownerName: string | null;
    since: string | null;
    createdBy: string | null;
    hidden: boolean;
  };
  parentName: string | null;
  artistName: string | null;
  // People of the network who work for this organization.
  members: { id: string; name: string; roles: NetworkContactRow["roles"] }[];
  // Contracts naming this contact, among those the viewer may read.
  contracts: {
    id: string;
    title: string;
    status: string;
    role: string | null;
  }[];
};

// Once per request: the contact's frame answers a real 404 without it and
// its page reuses the read.
export const getNetworkContact = trackedCache(async function getNetworkContact(
  id: string,
): Promise<NetworkContactDetail | null> {
  const supabase = await createClient();
  const [contact, members, parties] = await Promise.all([
    supabase
      .from("network_contacts")
      .select(
        "*, artist:artists!network_contacts_artist_same_org(name), owner:people!network_contacts_private_owner_person_id_fkey(first_name, last_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("network_contacts")
      .select("id, name, roles")
      .eq("parent_id", id)
      .is("archived_at", null)
      .order("name"),
    // RLS on contracts: a contract the viewer may not read is left out.
    supabase
      .from("contract_parties")
      .select(
        "role, contract:contracts!contract_parties_contract_same_org(id, title, status)",
      )
      .eq("contact_id", id),
  ]);
  if (contact.error) console.error("getNetworkContact:", contact.error.message);
  if (!contact.data) return null;
  // A private contact's coordinates, for whoever may read them (BIZ 8).
  const {
    rows: [row],
    hidden,
  } = await withPrivateDetails(supabase, [contact.data]);
  const [parents, pictures] = await Promise.all([
    parentNames(supabase, [row.parent_id]),
    signNetworkPictures(row.picture_path ? [row.picture_path] : []),
  ]);
  return {
    id: row.id,
    kind: kindOf(row.kind),
    name: row.name,
    roles: networkRolesOf(row.roles),
    relations: networkRelationsOf(row.relations),
    parentId: row.parent_id,
    artistId: row.artist_id,
    email: row.email,
    phone: row.phone,
    website: row.website,
    city: row.city,
    notes: row.notes,
    tiktok: row.tiktok_handle,
    instagram: row.instagram_handle,
    spotifyId: row.spotify_artist_id,
    deezerId: row.deezer_artist_id,
    pictureUrl: row.picture_path
      ? (pictures.get(row.picture_path) ?? null)
      : null,
    pictureSource: networkPictureSourceOf(row.picture_source),
    archived: row.archived_at !== null,
    privacy: {
      ownerId: row.private_owner_person_id,
      ownerName: row.owner
        ? personName(row.owner.first_name, row.owner.last_name)
        : null,
      since: row.private_since,
      createdBy: row.created_by,
      hidden: hidden.has(row.id),
    },
    parentName: row.parent_id ? (parents.get(row.parent_id) ?? null) : null,
    artistName: row.artist?.name ?? null,
    members: (members.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      roles: networkRolesOf(m.roles),
    })),
    contracts: (parties.data ?? []).flatMap((party) =>
      party.contract
        ? [
            {
              id: party.contract.id,
              title: party.contract.title,
              status: party.contract.status,
              role: party.role,
            },
          ]
        : [],
    ),
  };
});

/** What the contact form offers: live organizations and catalog artists,
 * and the live contacts a new one may duplicate. */
export async function loadNetworkFormOptions(): Promise<NetworkFormOptions> {
  const supabase = await createClient();
  const [contacts, artists] = await Promise.all([
    supabase
      .from("network_contacts")
      .select("id, name, kind")
      .is("archived_at", null)
      .order("name")
      .limit(LIST_LIMIT),
    supabase
      .from("artists")
      .select("id, name")
      .is("archived_at", null)
      .order("name")
      .limit(LIST_LIMIT),
  ]);
  if (contacts.error || artists.error)
    console.error(
      "loadNetworkFormOptions:",
      contacts.error?.message ?? artists.error?.message,
    );
  const all = (contacts.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    kind: kindOf(c.kind),
  }));
  return {
    organizations: all
      .filter((c) => c.kind === "organization")
      .map(({ id, name }) => ({ id, name })),
    artists: artists.data ?? [],
    contacts: all,
  };
}

type FoundContact = { id: string; name: string };

/**
 * Live contacts holding one of these accounts (Labo: "already in the
 * Réseau"), keyed by lowercased handle or Deezer id. Never by name: two
 * artists may share one.
 */
export async function findContactsByAccounts(accounts: {
  tiktok: string[];
  instagram: string[];
  deezer: number[];
}): Promise<{
  tiktok: Map<string, FoundContact>;
  instagram: Map<string, FoundContact>;
  deezer: Map<number, FoundContact>;
}> {
  const found = {
    tiktok: new Map<string, FoundContact>(),
    instagram: new Map<string, FoundContact>(),
    deezer: new Map<number, FoundContact>(),
  };
  // Handles are saved lowercased (lib/network/socials.ts); only valid
  // handles reach the filter, so nothing can break out of it.
  const handles = (values: string[]) => [
    ...new Set(values.flatMap((v) => asHandle(v)?.toLowerCase() ?? [])),
  ];
  const filters = [
    handles(accounts.tiktok).length > 0 &&
      `tiktok_handle.in.(${handles(accounts.tiktok).join(",")})`,
    handles(accounts.instagram).length > 0 &&
      `instagram_handle.in.(${handles(accounts.instagram).join(",")})`,
    accounts.deezer.length > 0 &&
      `deezer_artist_id.in.(${[...new Set(accounts.deezer)].join(",")})`,
  ].filter((filter): filter is string => !!filter);
  if (filters.length === 0) return found;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_contacts")
    .select("id, name, tiktok_handle, instagram_handle, deezer_artist_id")
    .is("archived_at", null)
    .or(filters.join(","))
    .limit(LIST_LIMIT);
  if (error) {
    console.error("findContactsByAccounts:", error.message);
    return found;
  }
  for (const row of data) {
    const contact = { id: row.id, name: row.name };
    if (row.tiktok_handle)
      found.tiktok.set(row.tiktok_handle.toLowerCase(), contact);
    if (row.instagram_handle)
      found.instagram.set(row.instagram_handle.toLowerCase(), contact);
    if (row.deezer_artist_id) found.deezer.set(row.deezer_artist_id, contact);
  }
  return found;
}
