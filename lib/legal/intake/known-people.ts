// Who PDS OS already knows on a title, for the people question of the
// Cadrage juridique (Sacha, 10/10/2026: « le code connaît déjà des choses » —
// the question asked from scratch what the title and the Cadrage said, which
// breaks « ne jamais faire retaper », CLAUDE.md). Pure: the code lists them
// and writes them as the answer offered; the person completes it with what
// only they know (composition, text, arrangement, production, musicians),
// PO reads it and a person keeps it, as for any answer.
//
//   performer          ← the artists of the title (its fiche artiste),
//                        a featured one said so (UX test of 09/10/2026);
//   mix / mastering    ← the engineers the Cadrage confirmed, held by a
//                        contact of the Réseau (project_team_members);
//   recording / mix /  ← the engineer written on a session of the title
//   mastering            (recording, mixing, mastering sessions only: who
//                        ran a production session is not its producer).
//
// Nothing is guessed: no one becomes a composer or a lyricist here.

import { legal } from "@/lib/i18n/fr/legal";
import type { PersonRole } from "@/lib/legal/intake/types";
import { normalizeSearch } from "@/lib/utils/search";

const fr = { legal };

export type KnownSource = "title" | "featuring" | "cadrage" | "session";

export type KnownPerson = {
  name: string;
  roles: PersonRole[];
  // The Réseau contact the person is known as (the Cadrage's engineers):
  // the credit is linked to it, never by the name (docs/ARCHITECTURE.md
  // § 8 sexies).
  contactId: string | null;
  sources: KnownSource[];
};

export type KnownRows = {
  // Artists of each title, in their order.
  artists: Array<{ masterId: string; name: string; featuring: boolean }>;
  // Engineers confirmed at the Cadrage, for the whole project.
  team: Array<{ role: PersonRole; name: string; contactId: string }>;
  sessions: Array<{ masterId: string; kind: string; engineer: string | null }>;
};

const SESSION_ROLES: Record<string, PersonRole> = {
  recording: "recording_engineer",
  mixing: "mix_engineer",
  mastering: "mastering_engineer",
};

const ORDER: PersonRole[] = [
  "performer",
  "recording_engineer",
  "mix_engineer",
  "mastering_engineer",
];

/** Known people of each title, one entry per person (same name merged). */
export function knownPeopleOf(
  masterIds: string[],
  rows: KnownRows,
): Map<string, KnownPerson[]> {
  const known = new Map<string, KnownPerson[]>();
  for (const masterId of masterIds) {
    const people: KnownPerson[] = [];
    const add = (
      name: string,
      role: PersonRole,
      source: KnownSource,
      contactId: string | null = null,
    ) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = normalizeSearch(trimmed);
      let person = people.find((p) => normalizeSearch(p.name) === key);
      if (!person) {
        person = { name: trimmed, roles: [], contactId, sources: [] };
        people.push(person);
      }
      if (!person.roles.includes(role)) person.roles.push(role);
      if (!person.sources.includes(source)) person.sources.push(source);
      person.contactId ??= contactId;
    };

    for (const artist of rows.artists)
      if (artist.masterId === masterId)
        add(artist.name, "performer", artist.featuring ? "featuring" : "title");
    for (const member of rows.team)
      add(member.name, member.role, "cadrage", member.contactId);
    for (const session of rows.sessions) {
      const role = SESSION_ROLES[session.kind];
      if (session.masterId === masterId && role && session.engineer)
        add(session.engineer, role, "session");
    }
    for (const person of people)
      person.roles.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    if (people.length > 0) known.set(masterId, people);
  }
  return known;
}

/** The Réseau contact of a name PO read, among the title's known people. */
export function knownContactOf(
  people: KnownPerson[],
  name: string,
): string | null {
  const key = normalizeSearch(name);
  return (
    people.find((person) => normalizeSearch(person.name) === key)?.contactId ??
    null
  );
}

/** The known people written as the start of the answer, one line each,
 * then an empty line for the person to go on. */
export function knownAnswer(people: KnownPerson[]): string {
  const t = fr.legal.intake.known;
  const lines = people.map((person) =>
    t.line(
      person.name,
      person.roles.map((role) => t.roles[role] ?? role),
      person.sources.map((source) => t.sources[source] ?? source),
    ),
  );
  return `${lines.join("\n")}\n`;
}
