import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import {
  CONTRIBUTOR_ROLES,
  DECLARATION_STATUSES,
  ORGANISMS,
  SESSION_KINDS,
  SESSION_STATUSES,
  SPLIT_KINDS,
  SPLIT_ROLES,
  WORK_STATUSES,
  oneOf,
  type MasterContributor,
  type MasterDeclaration,
  type MasterRights,
  type MasterSession,
  type MasterSplit,
  type MasterTrack,
  type Organism,
  type WorkItem,
} from "@/lib/catalog/master/rules";
import { FILE_BUCKETS, withDownloadName } from "@/lib/catalog/file-rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Sections of the master page, read with the user's session: RLS decides
// (splits need manage_catalog). Each list is ordered for display.

type Listed<K extends string, T> = { [key in K]: T[] } & { error: boolean };

function failed(scope: string, message: string) {
  console.error(`${scope}:`, message);
}

export const getMasterRights = trackedCache(
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
  // The sessions linked to this title (retour 27), whichever title they
  // were created on.
  const [links, tracks] = await Promise.all([
    supabase
      .from("master_session_titles")
      .select(
        "session_id, master_sessions!inner(id, kind, session_date, studio, engineer, engineer_contact_id, notes, status, starts_at, ends_at, created_at)",
      )
      .eq("master_id", masterId),
    supabase
      .from("master_tracks")
      .select("id, name, performer, session_id")
      .eq("master_id", masterId)
      .order("created_at"),
  ]);
  const error = links.error ?? tracks.error;
  if (error) {
    failed("listMasterSessions", error.message);
    return { sessions: [], tracks: [], error: true };
  }
  const rows = (links.data ?? []).map((l) => l.master_sessions);
  const ids = rows.map((r) => r.id);
  const titles = ids.length
    ? await supabase
        .from("master_session_titles")
        .select("session_id, masters!inner(id, title)")
        .in("session_id", ids)
    : { data: [], error: null };
  if (titles.error) failed("listMasterSessions titles", titles.error.message);
  const titlesOf = (id: string) =>
    (titles.data ?? [])
      .filter((t) => t.session_id === id)
      .map((t) => ({ id: t.masters.id, title: t.masters.title }));
  const sorted = [...rows].sort(
    (a, b) =>
      (a.session_date ?? "9999").localeCompare(b.session_date ?? "9999") ||
      a.created_at.localeCompare(b.created_at),
  );
  return {
    sessions: sorted.map((row) => ({
      id: row.id,
      kind: oneOf(SESSION_KINDS, row.kind, "other"),
      date: row.session_date,
      studio: row.studio,
      engineer: row.engineer,
      notes: row.notes,
      status: oneOf(SESSION_STATUSES, row.status, "done"),
      startsAt: row.starts_at?.slice(0, 5) ?? null,
      endsAt: row.ends_at?.slice(0, 5) ?? null,
      engineerContactId: row.engineer_contact_id,
      titles: titlesOf(row.id),
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

/**
 * The working files of a title (retours 36 et 38): its files of the
 * « stems » category, last version of each, and the links kept for what
 * exceeds the storage limit.
 */
export async function listWorkItems(
  masterId: string,
): Promise<{ items: WorkItem[]; error: boolean }> {
  const supabase = await createClient();
  const [files, links] = await Promise.all([
    supabase
      .from("master_files")
      .select(
        "id, file_name, description, version, series_id, session_id, work_status, created_at, path, people:created_by(first_name, last_name)",
      )
      .eq("master_id", masterId)
      .eq("category", "stems")
      .order("version", { ascending: false }),
    supabase
      .from("master_work_links")
      .select(
        "id, label, url, session_id, work_status, created_at, people:created_by(first_name, last_name)",
      )
      .eq("master_id", masterId)
      .order("created_at", { ascending: false }),
  ]);
  const error = files.error ?? links.error;
  if (error) {
    failed("listWorkItems", error.message);
    return { items: [], error: true };
  }
  const author = (
    p: { first_name: string; last_name: string | null } | null,
  ) => (p ? personName(p.first_name, p.last_name) : "—");
  // One line per file: its last version.
  const seen = new Set<string>();
  const latest = (files.data ?? []).filter((f) => {
    if (seen.has(f.series_id)) return false;
    seen.add(f.series_id);
    return true;
  });
  const signed = latest.length
    ? await supabase.storage.from(FILE_BUCKETS.master).createSignedUrls(
        latest.map((f) => f.path),
        3600,
      )
    : { data: [], error: null };
  if (signed.error) failed("listWorkItems (sign)", signed.error.message);
  const urlOf = new Map(
    (signed.data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
    ),
  );
  const items: WorkItem[] = [
    ...latest.map((f) => ({
      id: f.id,
      kind: "file" as const,
      name: f.file_name,
      description: f.description,
      version: f.version,
      sessionId: f.session_id,
      status: f.work_status
        ? oneOf(WORK_STATUSES, f.work_status, "provisional")
        : null,
      createdAt: f.created_at,
      authorName: author(f.people),
      url: null,
      openUrl: urlOf.get(f.path) ?? null,
      downloadUrl: urlOf.has(f.path)
        ? withDownloadName(urlOf.get(f.path)!, f.file_name)
        : null,
    })),
    ...(links.data ?? []).map((l) => ({
      id: l.id,
      kind: "link" as const,
      name: l.label,
      description: null,
      version: 1,
      sessionId: l.session_id,
      status: l.work_status
        ? oneOf(WORK_STATUSES, l.work_status, "provisional")
        : null,
      createdAt: l.created_at,
      authorName: author(l.people),
      url: l.url,
      openUrl: null,
      downloadUrl: null,
    })),
  ];
  return {
    items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
