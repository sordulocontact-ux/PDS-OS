import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { unsealLinkToken } from "@/lib/legal/forms/link-seal";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import type { PublishingHint } from "@/lib/legal/splits/draft";
import { loadPublishingHints } from "@/lib/legal/splits/hints";
import {
  splitRoleOf,
  titlePublishingLines,
  unitsOf,
  type SplitRole,
} from "@/lib/legal/splits/shares";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils/search";
import type { ContributorRole } from "@/lib/catalog/master/rules";

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
  // A publisher's line (JUR-01): the positions (from 1) of the creators it
  // represents, and whether it is the house (PDS Éditions: the team, no link).
  represents: number[] | null;
  house: boolean;
  confirmation: {
    state: ConfirmationState;
    at: string | null;
    comment: string | null;
    // The private link while it waits (rule 19): its URL when the server
    // can unseal it, when it was created and sent, by whom.
    link?: SplitLinkView | null;
  };
};

export type SplitLinkView = {
  confirmationId: string;
  url: string | null;
  createdAt: string;
  expiresAt: string;
  sentAt: string | null;
  sentBy: string | null;
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
  // What the editor starts from when nothing is written yet: the split of
  // the title's page when it makes 100 % without a publisher, else the
  // creators credited on the title, with no part (PO never proposes one).
  proposal: SplitLine[];
  fromTitle: boolean;
  // What PDS OS knows of each creator's publisher, by contact.
  hints: Record<string, PublishingHint>;
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
              "id, version_id, position, name, role, share, contact_id, credit_id, represents, house",
            )
            .in("version_id", versionIds)
            .order("position"),
          supabase
            .from("legal_split_confirmations")
            .select(
              "id, entry_id, status, expires_at, responded_at, comment, created_at, link_sealed, sent_at, sent_by",
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
  const senders = [
    ...new Set(
      (answers.data ?? []).flatMap((a) => (a.sent_by ? [a.sent_by] : [])),
    ),
  ];
  const people =
    senders.length > 0
      ? await supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", senders)
      : { data: [] };
  const nameOf = new Map(
    (people.data ?? []).map((p) => [
      p.id,
      personName(p.first_name, p.last_name),
    ]),
  );
  const answerOf = new Map<string, SplitLine["confirmation"]>();
  for (const a of answers.data ?? []) {
    if (answerOf.has(a.entry_id)) continue;
    const state: ConfirmationState =
      a.status === "pending" && a.expires_at < now
        ? "expired"
        : (a.status as ConfirmationState);
    const token = state === "pending" ? unsealLinkToken(a.link_sealed) : null;
    answerOf.set(a.entry_id, {
      state,
      at: a.responded_at,
      comment: a.comment,
      link:
        state === "pending"
          ? {
              confirmationId: a.id,
              url: token ? `${siteUrl()}${routes.legalSplit(token)}` : null,
              createdAt: a.created_at,
              expiresAt: a.expires_at,
              sentAt: a.sent_at,
              sentBy: a.sent_by ? (nameOf.get(a.sent_by) ?? null) : null,
            }
          : null,
    });
  }

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
        represents: e.represents,
        house: e.house,
        confirmation: answerOf.get(e.id) ?? NO_ANSWER,
      })),
  });

  // Who created each title, once each (by contact, else by name), with all
  // their creator credits (words and music: author and composer).
  const creatorsOf = (masterId: string) => {
    const byKey = new Map<
      string,
      {
        name: string;
        contactId: string | null;
        creditId: string;
        roles: ContributorRole[];
      }
    >();
    for (const c of rows.creditsOf.get(masterId) ?? []) {
      const key = c.contactId ?? normalizeSearch(c.name);
      const known = byKey.get(key);
      if (known) known.roles.push(c.role);
      else
        byKey.set(key, {
          name: c.name,
          contactId: c.contactId,
          creditId: c.id,
          roles: [c.role],
        });
    }
    return [...byKey.values()].flatMap((c) => {
      const role = splitRoleOf(c.roles);
      return role ? [{ ...c, role }] : [];
    });
  };
  const contactIds = [
    ...new Set([
      ...rows.titles.flatMap((m) =>
        creatorsOf(m.id).flatMap((c) => (c.contactId ? [c.contactId] : [])),
      ),
      ...(entries.data ?? []).flatMap((e) =>
        e.contact_id ? [e.contact_id] : [],
      ),
    ]),
  ];
  const hints = await loadPublishingHints(project.id, contactIds);

  return rows.titles.map((master): TitleSplit => {
    const sheet = (sheets.data ?? []).find((s) => s.master_id === master.id);
    const theirs = (versions.data ?? [])
      .filter((v) => v.sheet_id === sheet?.id)
      .map(view);
    const draft = theirs[0]?.status === "draft" ? theirs[0] : null;
    const active =
      theirs.find((v) => v.status !== "draft" && v.status !== "superseded") ??
      null;

    const titleLines = titlePublishingLines(rows.splitsOf.get(master.id) ?? []);
    // A publisher on the title's page does not say whom it represents: the
    // team says it in the editor.
    const fromTitle =
      titleLines !== null && !titleLines.some((l) => l.role === "publisher");
    return {
      masterId: master.id,
      title: master.title,
      active,
      draft,
      proposal: fromTitle
        ? titleLines.map((line) => ({
            id: null,
            ...line,
            creditId: null,
            represents: null,
            house: false,
            confirmation: NO_ANSWER,
          }))
        : creatorsOf(master.id).map((c) => ({
            id: null,
            name: c.name,
            role: c.role,
            units: 0,
            contactId: c.contactId,
            creditId: c.creditId,
            represents: null,
            house: false,
            confirmation: NO_ANSWER,
          })),
      fromTitle,
      hints,
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
            .in("version_id", vIds)
            // The house is the team: no answer is awaited from it.
            .eq("house", false),
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
