// Rows of the État du master's queries turned into the inputs of the fact
// builders, grouped by title. Pure: no database here (inventory-rows.ts).

import { SESSION_KINDS, oneOf } from "@/lib/catalog/master/rules";
import { audioStateOf } from "@/lib/catalog/title-rules";
import type { FlowAudio, FlowSource } from "@/lib/master-workflow/audio-source";
import type {
  FlowCredit,
  FramingEngineer,
} from "@/lib/master-workflow/engineer-facts";
import type {
  FlowContact,
  FlowLinkedCredit,
} from "@/lib/master-workflow/network-engineers";
import type { FlowSession } from "@/lib/master-workflow/source-facts";
import { ENGINEER_ROLES, type EngineerRole } from "@/lib/master-workflow/types";
import { networkRolesOf } from "@/lib/network/types";
import { personName } from "@/lib/projects/types";

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

const engineerRole = (value: string) =>
  oneOf<EngineerRole>(ENGINEER_ROLES, value, "mix_engineer");

/** Audio versions per title, and the number of stems files (one per
 * series: the versions of a file count once). */
export function filesByTitle(
  rows: Array<{
    id: string;
    master_id: string;
    series_id: string;
    category: string;
    file_name: string;
    audio_state: string | null;
    version: number;
    created_at: string;
  }>,
): { audioOf: Map<string, FlowAudio[]>; stemsOf: Map<string, number> } {
  const audioOf = new Map<string, FlowAudio[]>();
  const stemSeries = new Map<string, Set<string>>();
  for (const row of rows) {
    const audioState = audioStateOf(row.audio_state);
    if (row.category === "audio" && audioState)
      push(audioOf, row.master_id, {
        id: row.id,
        fileName: row.file_name,
        audioState,
        version: row.version,
        createdAt: row.created_at,
      });
    if (row.category === "stems") {
      const series = stemSeries.get(row.master_id) ?? new Set<string>();
      series.add(row.series_id);
      stemSeries.set(row.master_id, series);
    }
  }
  return {
    audioOf,
    stemsOf: new Map(
      [...stemSeries].map(([masterId, series]) => [masterId, series.size]),
    ),
  };
}

export function sessionsByTitle(
  rows: Array<{
    id: string;
    master_id: string;
    kind: string;
    session_date: string | null;
    studio: string | null;
    engineer: string | null;
    notes: string | null;
    created_at: string;
  }>,
): Map<string, FlowSession[]> {
  const sessionsOf = new Map<string, FlowSession[]>();
  for (const row of rows)
    push(sessionsOf, row.master_id, {
      id: row.id,
      kind: oneOf(SESSION_KINDS, row.kind, "other"),
      date: row.session_date,
      studio: row.studio,
      engineer: row.engineer,
      notes: row.notes,
      createdAt: row.created_at,
    });
  return sessionsOf;
}

export function creditsByTitle(
  rows: Array<{
    id: string;
    master_id: string;
    name: string;
    role: string;
    detail: string | null;
    contact_id: string | null;
  }>,
): Map<string, FlowCredit[]> {
  const creditsOf = new Map<string, FlowCredit[]>();
  for (const row of rows)
    push(creditsOf, row.master_id, {
      id: row.id,
      name: row.name,
      role: engineerRole(row.role),
      detail: row.detail,
      contactId: row.contact_id,
    });
  return creditsOf;
}

/** Confirmations newest first: the first of a title is its current source. */
export function currentSources(
  rows: Array<{
    master_id: string;
    file_id: string;
    created_at: string;
    confirmer: { first_name: string; last_name: string | null } | null;
  }>,
): Map<string, FlowSource> {
  const sourceOf = new Map<string, FlowSource>();
  for (const row of rows)
    if (!sourceOf.has(row.master_id))
      sourceOf.set(row.master_id, {
        fileId: row.file_id,
        confirmedAt: row.created_at,
        confirmedBy: row.confirmer
          ? personName(row.confirmer.first_name, row.confirmer.last_name)
          : null,
      });
  return sourceOf;
}

export function contactsOf(
  rows: Array<{
    id: string;
    name: string;
    roles: string[];
    email: string | null;
    phone: string | null;
    city: string | null;
    parent_id: string | null;
  }>,
): FlowContact[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    roles: networkRolesOf(row.roles),
    email: row.email,
    phone: row.phone,
    city: row.city,
    parentId: row.parent_id,
  }));
}

export function linkedCreditsOf(
  rows: Array<{ master_id: string; role: string; contact_id: string | null }>,
): FlowLinkedCredit[] {
  return rows.flatMap((row) =>
    row.contact_id
      ? [
          {
            contactId: row.contact_id,
            masterId: row.master_id,
            role: engineerRole(row.role),
          },
        ]
      : [],
  );
}

/** Who mixes and who masters, as the Cadrage confirmed them: a team role
 * held by a contact of the Réseau (the first confirmed per role). Its name
 * is the contact's current one; the name given at the Cadrage otherwise. */
export function framingEngineersOf(
  rows: Array<{
    role_key: string | null;
    contact_id: string | null;
    display_name: string;
  }>,
  contacts: FlowContact[],
): Map<EngineerRole, FramingEngineer> {
  const nameOf = new Map(contacts.map((contact) => [contact.id, contact.name]));
  const framingOf = new Map<EngineerRole, FramingEngineer>();
  for (const row of rows) {
    if (!row.contact_id || !row.role_key) continue;
    const role = ENGINEER_ROLES.find((key) => key === row.role_key);
    if (!role || framingOf.has(role)) continue;
    framingOf.set(role, {
      contactId: row.contact_id,
      name: nameOf.get(row.contact_id) ?? row.display_name,
    });
  }
  return framingOf;
}
