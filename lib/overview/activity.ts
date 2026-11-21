import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { eventText } from "@/lib/distribution/history";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { loadRecentActivity } from "@/lib/insights/activity";
import { loadLegalHistory } from "@/lib/legal/history/queries";
import { loadMarketingEvents } from "@/lib/marketing/queries";
import { actorless, describeEvent } from "@/lib/production/history-text";
import {
  participationRoleOf,
  participationStatusOf,
} from "@/lib/projects/participation-rules";
import { projectTitleLabel } from "@/lib/projects/title-rules";
import { formatShortDate } from "@/lib/release/format";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** One line of the project's Activité: « **Workflow** · what · who ». */
export type ActivityLine = {
  id: string;
  at: string;
  workflow: string;
  text: string;
  who: string | null;
  href: string | null;
};

const LIMIT = 200;

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The project's Activité (proto « Projet complet », `activityPage`): the
 * journals the workflows already write, gathered and sorted by date —
 * the project's own (calls, Cadrage, validations, files:
 * lib/insights/activity.ts), the Marketing's (marketing_events and each
 * deliverable's production_events), the Juridique's (only with
 * manage_legal, as its pages), the Distribution's (distribution_events),
 * a collective's titles (project_title_events: added, renamed, abandoned
 * with its reason, reactivated; an artist added to a title, its status
 * changed; the main artist changed, old → new), each to « Titres et
 * artistes ».
 * Read with the viewer's session: what RLS hides stays hidden. The Master
 * has no journal of its own yet. Nothing rewritten, nothing invented.
 */
export async function loadProjectActivity(
  project: ProjectDetail,
  access: Access,
): Promise<ActivityLine[]> {
  const supabase = await createClient();
  const name = fr.shell.project.sidebar;
  const legalAllowed = can(access, "manage_legal");
  const [
    members,
    own,
    marketing,
    production,
    legal,
    distribution,
    sheets,
    titles,
  ] = await Promise.all([
    loadMembers(access),
    loadRecentActivity({ projectId: project.id, days: 3650, limit: LIMIT }),
    loadMarketingEvents(project.id, access, { limit: LIMIT }),
    supabase
      .from("production_events")
      .select(
        "id, entity, action, before, after, actor_person_id, at, sheet_id",
      )
      .eq("project_id", project.id)
      .order("at", { ascending: false })
      .limit(LIMIT),
    legalAllowed ? loadLegalHistory(project, access) : null,
    supabase
      .from("distribution_events")
      .select("id, kind, data, actor, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("production_sheets")
      .select("id, deliverable_id")
      .eq("project_id", project.id),
    project.collective
      ? supabase
          .from("project_title_events")
          .select("id, kind, detail, actor_person_id, created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .order("seq", { ascending: false })
          .limit(LIMIT)
      : null,
  ]);
  if (production.error)
    console.error("loadProjectActivity production:", production.error.message);
  if (distribution.error)
    console.error(
      "loadProjectActivity distribution:",
      distribution.error.message,
    );
  if (titles?.error)
    console.error("loadProjectActivity titles:", titles.error.message);
  const person = (id: unknown) =>
    typeof id === "string"
      ? (members.find((m) => m.personId === id)?.name ?? null)
      : null;
  const ph = fr.productionHistory;
  const deliverableOf = (sheetId: string) => {
    const sheet = (sheets.data ?? []).find((s) => s.id === sheetId);
    return sheet
      ? routes.projectProductionSheet(project.id, sheet.deliverable_id)
      : routes.projectProduction(project.id);
  };

  const lines: ActivityLine[] = [
    ...own.map((e, i) => ({
      id: `own:${e.at}:${e.kind}:${i}`,
      at: e.at,
      workflow: fr.projectShell.activity.project,
      text: [capitalize(fr.assistant.activityKinds[e.kind] ?? e.kind), e.detail]
        .filter(Boolean)
        .join(" · "),
      who: null,
      href: e.href,
    })),
    ...marketing.map((e) => ({
      id: `marketing:${e.id}`,
      at: e.createdAt,
      workflow: name.marketing,
      text: fr.marketingReview.events[e.kind] ?? fr.marketing.events.other,
      who: e.actorName,
      href: routes.projectReview(project.id),
    })),
    ...(production.data ?? []).flatMap((row) => {
      const event = {
        id: row.id,
        entity: row.entity,
        action: row.action,
        before: record(row.before),
        after: record(row.after),
        actorName: person(row.actor_person_id),
        at: row.at,
      };
      const text = describeEvent(event, {
        holder: (value) => {
          const h = record(value);
          return h.kind === "person"
            ? (person(h.id) ?? ph.someone)
            : h.id
              ? ph.someone
              : ph.nobody;
        },
        person: (id) => person(id) ?? ph.someone,
      });
      if (!text) return [];
      return [
        {
          id: `production:${row.id}`,
          at: row.at,
          workflow: name.marketing,
          text: capitalize(text),
          who: actorless(event) ? null : (event.actorName ?? ph.provider),
          href: deliverableOf(row.sheet_id),
        },
      ];
    }),
    ...(legal?.events ?? []).map((e) => ({
      id: `legal:${e.id}`,
      at: e.at,
      workflow: name.legal,
      text: [e.action, e.subject].filter(Boolean).join(" · "),
      who: e.by,
      href: e.href,
    })),
    ...(titles?.data ?? []).map((row) => ({
      id: `titles:${row.id}`,
      at: row.created_at,
      workflow: fr.projectShell.activity.project,
      text: titleEventText(row.kind, record(row.detail)),
      who: person(row.actor_person_id),
      // The release mode leads to the collective's « Sorties » (lot 13).
      href:
        row.kind === "release_mode_changed"
          ? routes.projectReleases(project.id)
          : routes.projectTitles(project.id),
    })),
    ...(distribution.data ?? []).map((row) => ({
      id: `distribution:${row.id}`,
      at: row.created_at,
      workflow: name.distribution,
      text: eventText(row.kind, record(row.data)).text,
      who: person(row.actor),
      href: routes.projectRelease(project.id),
    })),
  ];
  return lines
    .filter((line) => line.text)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, LIMIT);
}

/** One line of a collective's titles history: the title named as it was
 * then (« Titre 3 (à nommer) » when it had no name); an artist's
 * participation by the artist's name then (never the interlocutor). */
function titleEventText(kind: string, detail: Record<string, unknown>): string {
  const t = fr.projectTitles.events;
  const p = fr.projectTitles.participations;
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  const role = (value: unknown) =>
    p.roles[participationRoleOf(text(value) ?? "")].toLowerCase();
  const status = (value: unknown) =>
    p.statuses[participationStatusOf(text(value) ?? "")];
  const position = typeof detail.position === "number" ? detail.position : 0;
  // A provisional name of the Catalogue is not the title's name (lot 7).
  const masterTitle =
    detail.master_provisional === true ? null : text(detail.master_title);
  const label = (workingTitle: string | null) =>
    projectTitleLabel({ position, workingTitle, masterTitle });
  const current = label(text(detail.working_title));
  switch (kind) {
    case "added":
      return t.added(current);
    case "renamed":
      return (detail.master_named === true ? t.renamedInCatalog : t.renamed)(
        projectTitleLabel({
          position,
          workingTitle: text(detail.from),
          masterTitle: detail.master_named === true ? null : masterTitle,
        }),
        label(text(detail.to)),
      );
    case "cataloged":
      return t.cataloged(current);
    case "master_attached":
      return t.masterAttached(
        projectTitleLabel({
          position,
          workingTitle: text(detail.working_title),
          masterTitle: null,
        }),
        text(detail.master_title) ?? "",
      );
    case "abandoned":
      return t.abandoned(current, text(detail.reason) ?? "");
    case "reactivated":
      return t.reactivated(current);
    case "participation_added":
      return t.participationAdded(
        text(detail.artist) ?? "",
        role(detail.role),
        status(detail.status).toLowerCase(),
        current,
      );
    case "participation_status":
      return t.participationStatus(
        text(detail.artist) ?? "",
        current,
        status(detail.from),
        status(detail.to),
      );
    case "main_artist_changed":
      return t.mainArtistChanged(text(detail.from), text(detail.to) ?? "");
    // Lot 13: the collective's release mode.
    case "release_mode_changed": {
      const modes = fr.collectiveReleases.modes;
      return fr.collectiveReleases.event(
        modes[text(detail.from) ?? ""] ?? "—",
        modes[text(detail.to) ?? ""] ?? "—",
      );
    }
    // Lot 12: the direction's waivers of a missing contract.
    case "waiver_granted":
    case "waiver_revoked": {
      const w = fr.participationWaivers.scopeOf;
      const scope = detail.scope === "release" ? w.release : w.shoot;
      const artist = text(detail.artist) ?? "";
      if (kind === "waiver_revoked")
        return t.waiverRevoked(scope, artist, current, text(detail.reason));
      const due = text(detail.due_on);
      return t.waiverGranted(
        scope,
        artist,
        current,
        due ? formatShortDate(due) : "",
        text(detail.reason) ?? "",
      );
    }
    default:
      return "";
  }
}
