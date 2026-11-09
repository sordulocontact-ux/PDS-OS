import "server-only";

import { z } from "zod";

import { demoStatusOf } from "@/lib/catalog/demo-rules";
import {
  SESSION_KINDS,
  SESSION_STATUSES,
  oneOf,
} from "@/lib/catalog/master/rules";
import { timeInParis, todayInParis } from "@/lib/insights/dates";
import { personName } from "@/lib/projects/types";
import { sessionStateOf, type ParisNow } from "@/lib/sessions/state";
import type {
  SessionAttendee,
  StudioSession,
  StudioSessionRow,
} from "@/lib/sessions/types";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const ROW_SELECT = `id, kind, status, session_date, starts_at, ends_at, studio, engineer,
  report_notes, created_by,
  artists:master_session_artists(artist:artists!master_session_artists_artist_same_org(id, name, archived_at)),
  projects:master_session_projects(linked_at, project:projects!master_session_projects_project_same_org(id, title, owner_person_id, archived_at)),
  titles:master_session_titles(linked_at, master:masters!master_session_titles_master_same_org(id, title, demo_status, archived_at,
    projects:project_masters!project_masters_master_same_org(project:projects!project_masters_project_same_org(id, title, owner_person_id, archived_at))))`;

const DETAIL_SELECT = `${ROW_SELECT}, engineer_contact_id, notes, report_takeaways,
  report_next_step, reported_at, reported_by,
  attendees:master_session_attendees(person_id, contact_id, created_at,
    contact:network_contacts!master_session_attendees_contact_same_org(name)),
  links:master_session_links(id, label, url, created_at)`;

type RawProject = {
  id: string;
  title: string;
  owner_person_id: string | null;
  archived_at: string | null;
};

type RawRow = {
  id: string;
  kind: string;
  status: string;
  session_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
  studio: string | null;
  engineer: string | null;
  report_notes: string | null;
  created_by: string | null;
  artists: Array<{
    artist: { id: string; name: string; archived_at: string | null } | null;
  }>;
  projects: Array<{ linked_at: string; project: RawProject | null }>;
  titles: Array<{
    linked_at: string;
    master: {
      id: string;
      title: string;
      demo_status: string | null;
      archived_at: string | null;
      projects: Array<{ project: RawProject | null }>;
    } | null;
  }>;
};

const byLink = (a: { linked_at: string }, b: { linked_at: string }) =>
  a.linked_at.localeCompare(b.linked_at);

/**
 * The session's projects: those it names, then those of its titles (Ibé,
 * 06/11/2026: a title chosen brings its project), each once, never an
 * archived one; RLS leaves out the projects the viewer cannot see.
 */
function projectsOf(row: RawRow): RawProject[] {
  const seen = new Set<string>();
  return [
    ...row.projects.toSorted(byLink).map((l) => l.project),
    ...row.titles
      .toSorted(byLink)
      .flatMap((l) =>
        l.master && !l.master.archived_at
          ? l.master.projects.map((p) => p.project)
          : [],
      ),
  ].filter((p): p is RawProject => {
    if (!p || p.archived_at || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

const parisNow = (): ParisNow => ({
  today: todayInParis(),
  time: timeInParis(),
});

// "HH:MM:SS" from Postgres, "HH:MM" on screen.
const hm = (value: string | null) => (value ? value.slice(0, 5) : null);

/** The people a set of sessions names, by id (one read). */
async function namesOf(
  supabase: Client,
  ids: Array<string | null>,
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  if (wanted.length === 0) return new Map();
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name")
    .in("id", wanted);
  if (error) console.error("[sessions] people:", error.message);
  return new Map(
    (data ?? []).map((p) => [p.id, personName(p.first_name, p.last_name)]),
  );
}

function ownerOf(row: RawRow): string | null {
  return (
    projectsOf(row).find((p) => p.owner_person_id)?.owner_person_id ?? null
  );
}

function toRow(
  row: RawRow,
  names: Map<string, string>,
  now: ParisNow,
): StudioSessionRow {
  const owner = ownerOf(row);
  const responsibleId = owner ?? row.created_by;
  return {
    id: row.id,
    kind: oneOf(SESSION_KINDS, row.kind, "other"),
    state: sessionStateOf(
      {
        status: oneOf(SESSION_STATUSES, row.status, "done"),
        date: row.session_date,
        startsAt: hm(row.starts_at),
        endsAt: hm(row.ends_at),
        reported: !!row.report_notes,
      },
      now,
    ),
    date: row.session_date,
    startsAt: hm(row.starts_at),
    endsAt: hm(row.ends_at),
    studio: row.studio,
    engineer: row.engineer,
    artists: row.artists.flatMap((l) =>
      l.artist && !l.artist.archived_at
        ? [{ id: l.artist.id, name: l.artist.name }]
        : [],
    ),
    projects: projectsOf(row).map((p) => ({ id: p.id, name: p.title })),
    titles: row.titles.toSorted(byLink).flatMap((l) =>
      l.master && !l.master.archived_at
        ? [
            {
              id: l.master.id,
              title: l.master.title,
              demoStatus: demoStatusOf(l.master.demo_status),
            },
          ]
        : [],
    ),
    responsible: responsibleId
      ? {
          personId: responsibleId,
          name: names.get(responsibleId) ?? "",
          why: owner ? "owner" : "creator",
        }
      : null,
  };
}

/** The ids of the sessions of an artist or a project (or of their titles),
 * or of one title. */
async function sessionIdsOf(
  supabase: Client,
  scope: { artistId?: string; projectId?: string; masterId?: string },
): Promise<string[]> {
  if (scope.masterId) {
    const { data } = await supabase
      .from("master_session_titles")
      .select("session_id")
      .eq("master_id", scope.masterId);
    return (data ?? []).map((l) => l.session_id);
  }
  const direct = scope.artistId
    ? supabase
        .from("master_session_artists")
        .select("session_id")
        .eq("artist_id", scope.artistId)
    : supabase
        .from("master_session_projects")
        .select("session_id")
        .eq("project_id", scope.projectId!);
  const titles = scope.artistId
    ? supabase
        .from("master_artists")
        .select("master_id")
        .eq("artist_id", scope.artistId)
    : supabase
        .from("project_masters")
        .select("master_id")
        .eq("project_id", scope.projectId!);
  const [linked, masters] = await Promise.all([direct, titles]);
  const masterIds = (masters.data ?? []).map((m) => m.master_id);
  const viaTitles = masterIds.length
    ? await supabase
        .from("master_session_titles")
        .select("session_id")
        .in("master_id", masterIds)
    : { data: [] };
  return [
    ...new Set([
      ...(linked.data ?? []).map((l) => l.session_id),
      ...(viaTitles.data ?? []).map((l) => l.session_id),
    ]),
  ];
}

/**
 * Studio sessions, the latest first (those without a date on top: still to
 * be fixed); `artistId` / `projectId` narrow to theirs, those of their
 * titles included; `masterId` to the title's own.
 */
export async function listStudioSessions(scope?: {
  artistId?: string;
  projectId?: string;
  masterId?: string;
  // Only the sessions whose report is not written yet (not cancelled).
  unreported?: boolean;
}): Promise<{ sessions: StudioSessionRow[]; error: boolean }> {
  const supabase = await createClient();
  let ids: string[] | null = null;
  if (scope?.artistId || scope?.projectId || scope?.masterId) {
    ids = await sessionIdsOf(supabase, scope);
    if (ids.length === 0) return { sessions: [], error: false };
  }
  let query = supabase.from("master_sessions").select(ROW_SELECT);
  if (ids) query = query.in("id", ids);
  if (scope?.unreported)
    query = query.is("report_notes", null).neq("status", "cancelled");
  const { data, error } = await query
    .order("session_date", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("listStudioSessions:", error.message);
    return { sessions: [], error: true };
  }
  const rows = (data ?? []) as unknown as RawRow[];
  const names = await namesOf(
    supabase,
    rows.flatMap((r) => [ownerOf(r) ?? r.created_by]),
  );
  const now = parisNow();
  return { sessions: rows.map((r) => toRow(r, names, now)), error: false };
}

/**
 * The sessions over whose report the person writes (« Compte rendu à
 * compléter », they are its responsible: the project manager, else the
 * creator): rows of their Travail and of the home (retour d'Ibé du
 * 01/11/2026).
 */
export async function listSessionsToReport(
  personId: string | null,
): Promise<{ sessions: StudioSessionRow[]; error: boolean }> {
  if (!personId) return { sessions: [], error: false };
  const { sessions, error } = await listStudioSessions({ unreported: true });
  return {
    sessions: sessions.filter(
      (s) => s.state === "toReport" && s.responsible?.personId === personId,
    ),
    error,
  };
}

type RawDetail = RawRow & {
  engineer_contact_id: string | null;
  notes: string | null;
  report_takeaways: string | null;
  report_next_step: string | null;
  reported_at: string | null;
  reported_by: string | null;
  attendees: Array<{
    person_id: string | null;
    contact_id: string | null;
    created_at: string;
    contact: { name: string } | null;
  }>;
  links: Array<{ id: string; label: string; url: string; created_at: string }>;
};

/** One session, with its participants, links and report; null if unseen. */
export async function getStudioSession(
  sessionId: string,
): Promise<StudioSession | null> {
  if (!z.uuid().safeParse(sessionId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_sessions")
    .select(DETAIL_SELECT)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`getStudioSession: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as RawDetail;
  const names = await namesOf(supabase, [
    ownerOf(row) ?? row.created_by,
    row.reported_by,
    ...row.attendees.map((a) => a.person_id),
  ]);
  const attendees: SessionAttendee[] = row.attendees
    .toSorted((a, b) => a.created_at.localeCompare(b.created_at))
    .flatMap((a): SessionAttendee[] =>
      a.person_id
        ? [
            {
              key: `m:${a.person_id}`,
              name: names.get(a.person_id) ?? "",
              external: false,
            },
          ]
        : a.contact_id && a.contact
          ? [{ key: `c:${a.contact_id}`, name: a.contact.name, external: true }]
          : [],
    );
  return {
    ...toRow(row, names, parisNow()),
    linkedProjectIds: row.projects.flatMap((l) =>
      l.project ? [l.project.id] : [],
    ),
    engineerContactId: row.engineer_contact_id,
    notes: row.notes,
    attendees,
    links: row.links
      .toSorted((a, b) => a.created_at.localeCompare(b.created_at))
      .map(({ id, label, url }) => ({ id, label, url })),
    reportNotes: row.report_notes,
    reportTakeaways: row.report_takeaways,
    reportNextStep: row.report_next_step,
    reportedAt: row.reported_at,
    reportedBy: row.reported_by ? (names.get(row.reported_by) ?? null) : null,
  };
}
