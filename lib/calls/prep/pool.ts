import type { PrepPerson } from "@/lib/calls/prep/types";

// Client-safe: the people a call's participants field offers, the same for
// « Nouveau call », « Nouvelle réunion » and « Modifier les participants ».

/** What « Modifier les participants » opens with: the choices, and who
 * takes part now. */
export type ParticipantsForm = { pool: PrepPerson[]; value: PrepPerson[] };

type PoolMember = { personId: string; name: string; detail?: string };
type PoolContact = {
  contactId: string;
  name: string;
  email: string | null;
  roles: string;
};

/** Members (`m:`), then Réseau contacts (`c:`), who cannot be invited
 * without an address. `memberDetail`: where a member stands when they carry
 * no place of their own; `noEmail`: a contact without roles nor address. */
export function participantPool(
  members: PoolMember[],
  contacts: PoolContact[],
  texts: { memberDetail: string; noEmail: string },
): PrepPerson[] {
  return [
    ...members.map((m) => ({
      key: `m:${m.personId}`,
      name: m.name,
      detail: m.detail ?? texts.memberDetail,
      external: false,
      invite: "app" as const,
      email: null,
    })),
    ...contacts.map((c) => ({
      key: `c:${c.contactId}`,
      name: c.name,
      detail: c.roles || texts.noEmail,
      external: true,
      invite: c.email ? ("email" as const) : null,
      email: c.email?.toLowerCase() ?? null,
    })),
  ];
}

/** An address typed in the field, invited by e-mail. */
export function emailParticipant(
  email: string,
  name: string | null,
  detail: string,
): PrepPerson {
  return {
    key: `e:${email}`,
    name: name ?? email,
    detail,
    external: true,
    invite: "email",
    email,
  };
}

/** What a participants field sends: the members' ids, the guests (a
 * contact by id, an address typed). */
export function participantsPayload(people: PrepPerson[]): {
  attendees: string[];
  guests: Array<{ contactId: string } | { email: string }>;
} {
  return {
    attendees: people.flatMap((p) =>
      p.key.startsWith("m:") ? [p.key.slice(2)] : [],
    ),
    guests: people.flatMap(
      (p): Array<{ contactId: string } | { email: string }> =>
        p.key.startsWith("c:")
          ? [{ contactId: p.key.slice(2) }]
          : p.key.startsWith("e:")
            ? [{ email: p.key.slice(2) }]
            : [],
    ),
  };
}
