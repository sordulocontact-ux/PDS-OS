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
 * manage_legal, as its pages), the Distribution's (distribution_events).
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
  const [members, own, marketing, production, legal, distribution, sheets] =
    await Promise.all([
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
    ]);
  if (production.error)
    console.error("loadProjectActivity production:", production.error.message);
  if (distribution.error)
    console.error(
      "loadProjectActivity distribution:",
      distribution.error.message,
    );
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
