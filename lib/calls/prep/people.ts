import "server-only";

import { loadCallContacts, loadCallMembers } from "@/lib/calls/invite";
import type { Client } from "@/lib/calls/prep/adapters/types";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import { isEmail } from "@/lib/utils/email";

const norm = (name: string) => name.trim().toLocaleLowerCase("fr");

/**
 * Who a prepared call may invite: the members call_attendees_check allows
 * (owner, creative team, direction, creative directors who join the
 * project), then the Réseau. A contact with a private link on this project is invited there
 * (`linkContactIds`), else by e-mail; one without an address cannot be
 * invited until the Réseau has it.
 */
export async function loadPrepPool(
  projectId: string,
  linkContactIds: string[] = [],
): Promise<PrepPerson[]> {
  const t = fr.callPrep;
  const [team, contacts] = await Promise.all([
    loadCallMembers(projectId),
    loadCallContacts(),
  ]);
  const links = new Set(linkContactIds);
  return [
    ...team.map((p): PrepPerson => ({
      key: `m:${p.personId}`,
      name: p.name,
      detail: t.roles[p.place],
      external: false,
      invite: "app",
      email: null,
    })),
    ...contacts.map((c): PrepPerson => ({
      key: `c:${c.contactId}`,
      name: c.name,
      detail: c.roles || t.external,
      external: true,
      invite: links.has(c.contactId) ? "link" : c.email ? "email" : null,
      email: c.email?.toLowerCase() ?? null,
    })),
  ];
}

/**
 * The participants a module proposes, as keys of the pool: by person or
 * contact id when it knows them, else by the names it computed from its own
 * data (the team first, then the Réseau). Unknown names are left out.
 */
export function proposedKeys(
  pool: PrepPerson[],
  proposal: { personIds?: string[]; contactIds?: string[]; names?: string[] },
): string[] {
  const keys = new Set<string>();
  for (const id of proposal.personIds ?? []) keys.add(`m:${id}`);
  for (const id of proposal.contactIds ?? []) keys.add(`c:${id}`);
  for (const name of proposal.names ?? []) {
    const found =
      pool.find((p) => !p.external && norm(p.name) === norm(name)) ??
      pool.find((p) => p.invite && norm(p.name) === norm(name));
    if (found) keys.add(found.key);
  }
  return [...keys].filter((key) => pool.some((p) => p.key === key));
}

export type ResolvedAttendees = {
  // Team members invited in the app (call_attendees).
  memberIds: string[];
  // Outside people with an address (call_guests).
  guests: Array<{
    email: string;
    name: string | null;
    contactId: string | null;
  }>;
  // Every participant, as the module tables store them.
  rows: Array<{
    name: string;
    person_id?: string;
    contact_id?: string;
    email?: string;
  }>;
};

/**
 * The keys sent by the form, checked against the pool read with the user's
 * session: never a name or an address taken from the browser for someone of
 * the team or the Réseau. Null when a key is unknown or cannot be invited.
 */
export function resolveAttendees(
  pool: PrepPerson[],
  keys: string[],
): ResolvedAttendees | null {
  const byKey = new Map(pool.map((p) => [p.key, p]));
  const out: ResolvedAttendees = { memberIds: [], guests: [], rows: [] };
  for (const key of new Set(keys)) {
    if (key.startsWith("e:")) {
      const email = key.slice(2).trim().toLowerCase();
      if (!isEmail(email)) return null;
      if (out.guests.some((g) => g.email === email)) continue;
      // An address the Réseau already has is its contact.
      const known = pool.find((p) => p.external && p.email === email);
      const contactId = known ? known.key.slice(2) : null;
      out.guests.push({ email, name: known?.name ?? null, contactId });
      out.rows.push(
        contactId
          ? { name: known!.name, contact_id: contactId }
          : { name: email, email },
      );
      continue;
    }
    const person = byKey.get(key);
    if (!person || !person.invite) return null;
    const id = key.slice(2);
    if (!person.external) {
      out.memberIds.push(id);
      out.rows.push({ name: person.name, person_id: id });
      continue;
    }
    out.rows.push({ name: person.name, contact_id: id });
    if (person.email && !out.guests.some((g) => g.email === person.email))
      out.guests.push({
        email: person.email,
        name: person.name,
        contactId: id,
      });
  }
  return out;
}

/**
 * An address typed in the field becomes a fiche of the Réseau (proto:
 * « Inviter x@y.fr · par e-mail, une fiche est créée dans le Réseau »),
 * created with the user's session; its row and guest then point to it.
 */
export async function fileTypedGuests(
  supabase: Client,
  organizationId: string,
  attendees: ResolvedAttendees,
): Promise<void> {
  for (const guest of attendees.guests) {
    if (guest.contactId) continue;
    const { data, error } = await supabase
      .from("network_contacts")
      .insert({
        organization_id: organizationId,
        kind: "person",
        name: guest.email,
        email: guest.email,
        roles: [],
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[calls] typed guest fiche failed:", error?.message);
      continue;
    }
    guest.contactId = data.id;
    const row = attendees.rows.find((r) => r.email === guest.email);
    if (row) {
      row.contact_id = data.id;
      delete row.email;
    }
  }
}
