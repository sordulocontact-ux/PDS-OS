// Lists of contacts of the Réseau (Ibé, 18/11/2026; migration
// 20261120160101_network_lists.sql): shared by the server and the client.

/** Each person's reply: Ibé's hourglass (waiting) and green tick. */
export const NETWORK_LIST_REPLIES = ["waiting", "replied"] as const;
export type NetworkListReply = (typeof NETWORK_LIST_REPLIES)[number];

export const asNetworkListReply = (value: string): NetworkListReply =>
  value === "replied" ? "replied" : "waiting";

/** For its author alone, shared and waiting for the direction, validated. */
export type NetworkListState = "private" | "toValidate" | "validated";

export function networkListStateOf(list: {
  shared: boolean;
  validatedAt: string | null;
}): NetworkListState {
  if (!list.shared) return "private";
  return list.validatedAt ? "validated" : "toValidate";
}

/** The tabs of « Mes listes ». */
export const NETWORK_LIST_VIEWS = ["mine", "shared"] as const;
export type NetworkListView = (typeof NETWORK_LIST_VIEWS)[number];

export const asNetworkListView = (value: unknown): NetworkListView | null =>
  NETWORK_LIST_VIEWS.find((v) => v === value) ?? null;

export const networkListRoutes = {
  lists: "/app/network/lists",
  list: (id: string) => `/app/network/lists/${id}`,
  // The project form, pre-filled with the list's artists.
  project: (id: string) => `/app/network/lists/${id}/project`,
};

type Person = { personId: string; name: string };

/** A row of « Mes listes ». */
export type NetworkListItem = {
  id: string;
  name: string;
  state: NetworkListState;
  owner: Person;
  // Its live contacts, by name.
  contactNames: string[];
  replied: number;
  updatedAt: string;
};

/** A list the viewer may add people to (« Ajouter à une liste »). */
export type NetworkListOption = {
  id: string;
  name: string;
  state: NetworkListState;
};

/** A person of a list, with its reply. */
export type NetworkListMember = {
  contactId: string;
  reply: NetworkListReply;
};

export type NetworkListDetail = {
  id: string;
  name: string;
  shared: boolean;
  state: NetworkListState;
  owner: Person;
  members: NetworkListMember[];
};
