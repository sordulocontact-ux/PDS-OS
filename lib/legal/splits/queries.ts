import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import {
  equalUnits,
  splitRoleOf,
  titlePublishingLines,
  unitsOf,
  type SplitRole,
} from "@/lib/legal/splits/shares";
import { createClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils/search";

// The split sheets of a project's titles (ticket Juridique 04), read with
// the viewer's session (RLS: manage_legal on a visible project).

export type VersionStatus =
  | "draft"
  | "proposed"
  | "partially_confirmed"
  | "confirmed"
  | "disputed"
  | "superseded";

export type ConfirmationState =
  "none" | "pending" | "confirmed" | "disputed" | "revoked" | "expired";

export type SplitLine = {
  id: string | null;
  name: string;
  role: SplitRole;
  units: number;
  contactId: string | null;
  creditId: string | null;
  confirmation: {
    state: ConfirmationState;
    at: string | null;
    comment: string | null;
  };
};

export type SplitVersionView = {
  id: string;
  version: number;
  status: VersionStatus;
  note: string | null;
  proposedAt: string | null;
  lines: SplitLine[];
};

export type TitleSplit = {
  masterId: string;
  title: string;
  // The version people answer (or answered), and a draft being prepared.
  active: SplitVersionView | null;
  draft: SplitVersionView | null;
  history: SplitVersionView[];
  // What the editor starts from when nothing is written yet: the split of
  // the title's page when it makes 100 %, else the creators credited on the
  // title, in equal parts (to verify).
  proposal: SplitLine[];
  fromTitle: boolean;
};

const NO_ANSWER = { state: "none" as const, at: null, comment: null };

export async function loadSplits(
  project: {
    id: string;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<TitleSplit[]> {
  const supabase = await createClient();
  const [rows, sheets] = await Promise.all([
    readInventoryRows(
      project.id,
      project.masters,
      can(access, "manage_catalog"),
    ),
    supabase
      .from("legal_split_sheets")
      .select("id, master_id")
      .eq("project_id", project.id),
  ]);
  if (sheets.error) console.error("loadSplits sheets:", sheets.error.message);
  const sheetIds = (sheets.data ?? []).map((s) => s.id);
  const versions =
    sheetIds.length > 0
      ? await supabase
          .from("legal_split_versions")
          .select("id, sheet_id, version, status, note, proposed_at")
          .in("sheet_id", sheetIds)
          .order("version", { ascending: false })
      : { data: [], error: null };
  const versionIds = (versions.data ?? []).map((v) => v.id);
  const [entries, answers] =
    versionIds.length > 0
      ? await Promise.all([
          supabase
            .from("legal_split_entries")
            .select(
              "id, version_id, position, name, role, share, contact_id, credit_id",
            )
            .in("version_id", versionIds)
            .order("position"),
          supabase
            .from("legal_split_confirmations")
            .select(
              "entry_id, status, expires_at, responded_at, comment, created_at",
            )
            .in("version_id", versionIds)
            .order("created_at", { ascending: false }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  // Each entry's latest link speaks for it.
  const now = new Date().toISOString();
  const answerOf = new Map<string, SplitLine["confirmation"]>();
  for (const a of answers.data ?? [])
    if (!answerOf.has(a.entry_id))
      answerOf.set(a.entry_id, {
        state:
          a.status === "pending" && a.expires_at < now
            ? "expired"
            : (a.status as ConfirmationState),
        at: a.responded_at,
        comment: a.comment,
      });

  const view = (
    v: NonNullable<typeof versions.data>[number],
  ): SplitVersionView => ({
    id: v.id,
    version: v.version,
    status: v.status as VersionStatus,
    note: v.note,
    proposedAt: v.proposed_at,
    lines: (entries.data ?? [])
      .filter((e) => e.version_id === v.id)
      .map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role as SplitRole,
        units: unitsOf(String(e.share)) ?? 0,
        contactId: e.contact_id,
        creditId: e.credit_id,
        confirmation: answerOf.get(e.id) ?? NO_ANSWER,
      })),
  });

  return rows.titles.map((master): TitleSplit => {
    const sheet = (sheets.data ?? []).find((s) => s.master_id === master.id);
    const theirs = (versions.data ?? [])
      .filter((v) => v.sheet_id === sheet?.id)
      .map(view);
    const draft = theirs[0]?.status === "draft" ? theirs[0] : null;
    const active =
      theirs.find((v) => v.status !== "draft" && v.status !== "superseded") ??
      null;

    // The creators once each (by name), from the title's credits.
    const seen = new Set<string>();
    const creators = (rows.creditsOf.get(master.id) ?? []).flatMap((c) => {
      const role = splitRoleOf(c.role);
      const key = normalizeSearch(c.name);
      if (!role || seen.has(key)) return [];
      seen.add(key);
      return [{ name: c.name, role, contactId: c.contactId, creditId: c.id }];
    });
    const parts = equalUnits(creators.length);
    const titleLines = titlePublishingLines(rows.splitsOf.get(master.id) ?? []);
    return {
      masterId: master.id,
      title: master.title,
      active,
      draft,
      history: theirs.filter((v) => v.status === "superseded"),
      proposal: titleLines
        ? titleLines.map((line) => ({
            id: null,
            ...line,
            creditId: null,
            confirmation: NO_ANSWER,
          }))
        : creators.map((c, i) => ({
            id: null,
            ...c,
            units: parts[i],
            confirmation: NO_ANSWER,
          })),
      fromTitle: Boolean(titleLines),
    };
  });
}

/** Where each title's active split stands, for the Suivi. */
export async function splitStates(projectId: string) {
  const supabase = await createClient();
  const { data: sheets } = await supabase
    .from("legal_split_sheets")
    .select("id, master_id")
    .eq("project_id", projectId);
  const ids = (sheets ?? []).map((s) => s.id);
  if (ids.length === 0) return new Map<string, SplitState>();
  const { data: versions } = await supabase
    .from("legal_split_versions")
    .select("id, sheet_id, status, proposed_at")
    .in("sheet_id", ids)
    .not("status", "in", "(draft,superseded)");
  const vIds = (versions ?? []).map((v) => v.id);
  const [entries, answers] =
    vIds.length > 0
      ? await Promise.all([
          supabase
            .from("legal_split_entries")
            .select("id, version_id")
            .in("version_id", vIds),
          supabase
            .from("legal_split_confirmations")
            .select("entry_id, version_id, status, created_at")
            .in("version_id", vIds)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];
  const latest = new Map<string, string>();
  for (const a of answers.data ?? [])
    if (!latest.has(a.entry_id)) latest.set(a.entry_id, a.status);
  const result = new Map<string, SplitState>();
  for (const v of versions ?? []) {
    const sheet = (sheets ?? []).find((s) => s.id === v.sheet_id);
    if (!sheet) continue;
    const mine = (entries.data ?? []).filter((e) => e.version_id === v.id);
    result.set(sheet.master_id, {
      status: v.status as VersionStatus,
      confirmed: mine.filter((e) => latest.get(e.id) === "confirmed").length,
      total: mine.length,
      since: v.proposed_at,
    });
  }
  return result;
}

export type SplitState = {
  status: VersionStatus;
  confirmed: number;
  total: number;
  since: string | null;
};
