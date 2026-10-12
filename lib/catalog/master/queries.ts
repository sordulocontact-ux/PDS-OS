import "server-only";

import { cache } from "react";

import {
  CONTRIBUTOR_ROLES,
  DECLARATION_STATUSES,
  ORGANISMS,
  SESSION_KINDS,
  SPLIT_KINDS,
  SPLIT_ROLES,
  oneOf,
  type MasterContributor,
  type MasterDeclaration,
  type MasterRights,
  type MasterSession,
  type MasterSplit,
  type MasterTrack,
  type Organism,
} from "@/lib/catalog/master/rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Sections of the master page, read with the user's session: RLS decides
// (splits need manage_catalog). Each list is ordered for display.

type Listed<K extends string, T> = { [key in K]: T[] } & { error: boolean };

function failed(scope: string, message: string) {
  console.error(`${scope}:`, message);
}

export const getMasterRights = cache(
  async (masterId: string): Promise<MasterRights | null> => {
    if (!catalogIdSchema.safeParse(masterId).success) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("masters")
      .select(
        "iswc, rights_holder, rights_year, rights_confirmed_at, rights_confirmed_by",
      )
      .eq("id", masterId)
      .maybeSingle();
    if (error) failed("getMasterRights", error.message);
    if (!data) return null;
    const { data: person } = data.rights_confirmed_by
      ? await supabase
          .from("people")
          .select("first_name, last_name")
          .eq("id", data.rights_confirmed_by)
          .maybeSingle()
      : { data: null };
    return {
      iswc: data.iswc,
      rightsHolder: data.rights_holder,
      rightsYear: data.rights_year,
      confirmedAt: data.rights_confirmed_at,
      confirmedBy: person
        ? personName(person.first_name, person.last_name)
        : null,
    };
  },
);

/** Sessions by date (undated last), and every track in the order added. */
export async function listMasterSessions(masterId: string): Promise<{
  sessions: MasterSession[];
  tracks: MasterTrack[];
  error: boolean;
}> {
  const supabase = await createClient();
  const [sessions, tracks] = await Promise.all([
    supabase
      .from("master_sessions")
      .select("id, kind, session_date, studio, engineer, notes")
      .eq("master_id", masterId)
      .order("session_date", { ascending: true, nullsFirst: false })
      .order("created_at"),
    supabase
      .from("master_tracks")
      .select("id, name, performer, session_id")
      .eq("master_id", masterId)
      .order("created_at"),
  ]);
  const error = sessions.error ?? tracks.error;
  if (error) {
    failed("listMasterSessions", error.message);
    return { sessions: [], tracks: [], error: true };
  }
  return {
    sessions: (sessions.data ?? []).map((row) => ({
      id: row.id,
      kind: oneOf(SESSION_KINDS, row.kind, "other"),
      date: row.session_date,
      studio: row.studio,
      engineer: row.engineer,
      notes: row.notes,
    })),
    tracks: (tracks.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      performer: row.performer,
      sessionId: row.session_id,
    })),
    error: false,
  };
}

/** Contributors in the order of the roles, then as added. */
export async function listMasterContributors(
  masterId: string,
): Promise<Listed<"contributors", MasterContributor>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_contributors")
    .select("id, name, role, detail, contact_id")
    .eq("master_id", masterId)
    .order("created_at");
  if (error) {
    failed("listMasterContributors", error.message);
    return { contributors: [], error: true };
  }
  const contributors = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    role: oneOf(CONTRIBUTOR_ROLES, row.role, "other"),
    detail: row.detail,
    contactId: row.contact_id,
  }));
  const rank = (c: MasterContributor) => CONTRIBUTOR_ROLES.indexOf(c.role);
  return {
    contributors: contributors.sort((a, b) => rank(a) - rank(b)),
    error: false,
  };
}

/** Shares, largest first within each kind. Empty without manage_catalog. */
export async function listMasterSplits(
  masterId: string,
): Promise<Listed<"splits", MasterSplit>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_splits")
    .select("id, kind, party, role, share, contact_id, artist_id")
    .eq("master_id", masterId)
    .order("share", { ascending: false })
    .order("created_at");
  if (error) {
    failed("listMasterSplits", error.message);
    return { splits: [], error: true };
  }
  return {
    splits: (data ?? []).map((row) => ({
      id: row.id,
      kind: oneOf(SPLIT_KINDS, row.kind, "master"),
      party: row.party,
      role: oneOf(SPLIT_ROLES, row.role, "other"),
      share: Number(row.share),
      contactId: row.contact_id,
      artistId: row.artist_id,
    })),
    error: false,
  };
}

/** Declarations filed, one per organism at most. */
export async function listMasterDeclarations(
  masterId: string,
): Promise<Listed<"declarations", MasterDeclaration>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_declarations")
    .select(
      "id, organism, status, reference, declared_on, notes, third_party, proof_file_id",
    )
    .eq("master_id", masterId);
  if (error) {
    failed("listMasterDeclarations", error.message);
    return { declarations: [], error: true };
  }
  return {
    declarations: (data ?? []).map((row) => ({
      id: row.id,
      organism: oneOf(ORGANISMS, row.organism, "sacem"),
      status: oneOf(DECLARATION_STATUSES, row.status, "to_verify"),
      reference: row.reference,
      date: row.declared_on,
      notes: row.notes,
      thirdParty: row.third_party,
      proofFileId: row.proof_file_id,
    })),
    error: false,
  };
}

export type DeclarationEvent = {
  id: string;
  organism: Organism;
  at: string;
  by: string | null;
  // field → [before, after], as the database recorded them.
  changes: Record<string, [unknown, unknown]>;
};

/**
 * Each change of a title's declarations, newest first (retour 62): who,
 * when, the old and the new value of status, reference, date, third party
 * and proof. Written by a trigger, never rewritten.
 */
export async function listDeclarationEvents(
  masterId: string,
): Promise<DeclarationEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_declaration_events")
    .select("id, organism, changes, actor_person_id, created_at")
    .eq("master_id", masterId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    failed("listDeclarationEvents", error.message);
    return [];
  }
  const ids = [
    ...new Set(
      (data ?? []).flatMap((e) =>
        e.actor_person_id ? [e.actor_person_id] : [],
      ),
    ),
  ];
  const { data: people } = ids.length
    ? await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", ids)
    : { data: [] };
  const nameOf = new Map(
    (people ?? []).map((p) => [p.id, personName(p.first_name, p.last_name)]),
  );
  return (data ?? []).map((e) => ({
    id: e.id,
    organism: oneOf(ORGANISMS, e.organism, "sacem"),
    at: e.created_at,
    by: e.actor_person_id ? (nameOf.get(e.actor_person_id) ?? null) : null,
    changes: (e.changes ?? {}) as Record<string, [unknown, unknown]>,
  }));
}
