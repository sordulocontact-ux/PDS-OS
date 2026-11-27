import "server-only";

import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { listAllCalls, type CallListItem } from "@/lib/calls/queries";
import {
  sortItems,
  type CalendarItem,
  type CalendarItemKind,
} from "@/lib/calendar/items";
import { SESSION_KINDS, oneOf } from "@/lib/catalog/master/rules";
import { calendar } from "@/lib/i18n/fr/calendar";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { freeTasksOf, loadMyTodo } from "@/lib/insights/todo";
import { listProjects } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { actionHref, lowerFirst } from "@/lib/ui/journey";
import {
  addDays,
  parisMidnight,
  parisPlace,
  periodRange,
  type CalendarPeriod,
} from "@/lib/utils/calendar-period";
import { loadLaunchedJourneys } from "@/lib/work/journeys";

const fr = { calendar, masterPage };

const sessionKindOf = (kind: string) => oneOf(SESSION_KINDS, kind, "other");

const t = fr.calendar.kinds;

export type CalendarData = {
  items: CalendarItem[];
  // The calls themselves, for the week's hours (moved, opened in a card).
  calls: CallListItem[];
  // A source could not be read: said, never shown as an empty month.
  error: boolean;
};

// The Brief Mix et Master's dates, in the order they come (master-workflow).
const MASTER_DATES = [
  ["mix_v1_due", t.mixV1],
  ["mix_final_due", t.mixFinal],
  ["mastering_due", t.mastering],
  ["master_final_due", t.masterFinal],
] as const;

// "09:30:00" (a time column) → minutes of the day.
const minuteOfTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/**
 * The Calendrier of a period (docs/ARCHITECTURE.md § 8, « Calendrier »): every date
 * PDS OS already knows in the projects the viewer sees — the project's date,
 * the Brief Mix et Master's four, the shoots decided, the Stratégie's temps
 * forts, the calls, the open steps with a due date (whoever acts) and the
 * viewer's own tasks. Nothing is typed here: each item opens where its date
 * is decided. Read with the user's session (RLS); an archived project's
 * dates are left out with it. A source that fails is said (`error`), the
 * others still show.
 */
export async function loadCalendar(
  period: CalendarPeriod,
  access: Access,
): Promise<CalendarData> {
  const supabase = await createClient();
  const first = period.days[0];
  const last = period.days[period.days.length - 1];
  const inPeriod = (day: string | null): day is string =>
    day !== null && day >= first && day <= last;
  const me = access.personId;

  const [
    listed,
    launched,
    briefs,
    decisions,
    sheets,
    milestones,
    calls,
    todo,
    sessions,
  ] = await Promise.all([
    listProjects(),
    loadLaunchedJourneys(),
    supabase
      .from("master_briefs")
      .select(
        "project_id, mix_v1_due, mix_final_due, mastering_due, master_final_due",
      ),
    supabase
      .from("production_schedule_decisions")
      .select("sheet_id, project_id, shoot_on, starts_at")
      .is("replaced_at", null)
      .gte("shoot_on", first)
      .lte("shoot_on", last),
    supabase
      .from("production_sheets")
      .select(
        "id, project_id, deliverable_id, shoot_date, deliverable:strategy_deliverables!production_sheets_deliverable_same_org(title)",
      ),
    supabase
      .from("milestones")
      .select("id, project_id, title, occurs_on")
      .gte("occurs_on", first)
      .lte("occurs_on", last),
    listAllCalls(supabase, { range: periodRange(period) }).catch(
      (error: unknown) => {
        console.error("loadCalendar: calls", error);
        return null;
      },
    ),
    loadMyTodo(access),
    // Studio sessions (retour d'Ibé du 01/11/2026), cancelled ones left out.
    supabase
      .from("master_sessions")
      .select(
        "id, kind, studio, session_date, starts_at, projects:master_session_projects(project_id, linked_at), attendees:master_session_attendees(person_id)",
      )
      .neq("status", "cancelled")
      .gte("session_date", first)
      .lte("session_date", last),
  ]);

  const failed = [briefs, decisions, sheets, milestones, sessions].find(
    (r) => r.error,
  );
  if (failed) console.error("loadCalendar:", failed.error?.message);

  // Only the projects the list shows (RLS, archive left out) lend their dates.
  const projects = listed.projects;
  const projectOf = new Map(projects.map((p) => [p.id, p]));
  const items: CalendarItem[] = [];
  const add = (
    kind: CalendarItemKind,
    item: Omit<CalendarItem, "kind" | "projectTitle" | "overdue" | "mine"> &
      Partial<Pick<CalendarItem, "overdue" | "mine">>,
  ) => {
    const project = item.projectId ? projectOf.get(item.projectId) : null;
    // A project's item whose project is not listed (archived) is left out.
    if (item.projectId && !project) return;
    items.push({
      kind,
      mine: false,
      overdue: false,
      ...item,
      projectTitle: project?.title ?? null,
    });
  };

  for (const p of projects)
    if (inPeriod(p.dueDate))
      add("release", {
        key: `release|${p.id}`,
        day: p.dueDate,
        minute: null,
        label: p.type === "music_release" ? t.release : t.projectDue,
        projectId: p.id,
        href: routes.project(p.id),
      });

  for (const brief of briefs.data ?? [])
    for (const [column, label] of MASTER_DATES) {
      const day = brief[column];
      if (inPeriod(day))
        add("master", {
          key: `master|${brief.project_id}|${column}`,
          day,
          minute: null,
          label,
          projectId: brief.project_id,
          href: routes.projectMasterStep(brief.project_id, "brief"),
        });
    }

  // A shoot decided replaces the sheet's own date (production_schedule).
  const sheetById = new Map((sheets.data ?? []).map((s) => [s.id, s]));
  const decided = new Set((decisions.data ?? []).map((d) => d.sheet_id));
  const shoots = [
    ...(decisions.data ?? []).map((d) => ({
      sheetId: d.sheet_id,
      day: d.shoot_on,
      minute: minuteOfTime(d.starts_at),
    })),
    ...(sheets.data ?? [])
      .filter((s) => !decided.has(s.id) && inPeriod(s.shoot_date))
      .map((s) => ({ sheetId: s.id, day: s.shoot_date ?? "", minute: null })),
  ];
  for (const shoot of shoots) {
    const sheet = sheetById.get(shoot.sheetId);
    if (!sheet) continue;
    add("shoot", {
      key: `shoot|${sheet.id}`,
      day: shoot.day,
      minute: shoot.minute,
      label: t.shoot(sheet.deliverable?.title ?? ""),
      projectId: sheet.project_id,
      href: routes.projectProductionSheet(
        sheet.project_id,
        sheet.deliverable_id,
      ),
    });
  }

  for (const m of milestones.data ?? [])
    add("milestone", {
      key: `milestone|${m.id}`,
      day: m.occurs_on,
      minute: null,
      label: m.title,
      projectId: m.project_id,
      href: routes.projectStrategyDimension(m.project_id, "calendar"),
    });

  for (const call of calls ?? []) {
    const place = parisPlace(new Date(call.occurredAt));
    add("call", {
      key: `call|${call.id}`,
      day: place.day,
      minute: place.minute,
      label: call.title,
      projectId: call.projectId,
      mine: me !== null && call.ownerPersonId === me,
      href: call.href,
    });
  }

  for (const session of sessions.data ?? []) {
    if (!session.session_date) continue;
    const [hour, minute] = (session.starts_at ?? "").split(":").map(Number);
    add("session", {
      key: `session|${session.id}`,
      day: session.session_date,
      minute: session.starts_at ? hour * 60 + minute : null,
      label: fr.calendar.session(
        session.studio ??
          fr.masterPage.sessions.kinds[sessionKindOf(session.kind)],
      ),
      projectId:
        session.projects.toSorted((a, b) =>
          a.linked_at.localeCompare(b.linked_at),
        )[0]?.project_id ?? null,
      mine: me !== null && session.attendees.some((a) => a.person_id === me),
      href: routes.session(session.id),
    });
  }

  // The journeys' open steps with a due date: the viewer's gesture, or who
  // is expected (« Nadia Benali : valider la pochette »).
  for (const { project, journeys } of launched.projects)
    for (const action of [...journeys.mine, ...journeys.waiting]) {
      const { step } = action;
      if (!inPeriod(step.due ?? null) || !step.actor) continue;
      const mine = step.actor.viewer;
      add("step", {
        key: `step|${project.id}|${action.place}|${step.key}`,
        day: step.due ?? "",
        minute: null,
        label: mine
          ? step.actor.todo
          : fr.calendar.someone(step.actor.name, lowerFirst(step.actor.todo)),
        projectId: project.id,
        mine,
        overdue: step.alert === "overdue",
        href: actionHref(step),
      });
    }

  for (const task of freeTasksOf(todo))
    if (inPeriod(task.dueDate))
      add("task", {
        key: `task|${task.id}`,
        day: task.dueDate,
        minute: null,
        label: task.title,
        projectId: task.projectId,
        mine: true,
        overdue: task.overdue,
        href: task.href,
      });

  return {
    items: sortItems(items),
    calls: calls ?? [],
    error:
      Boolean(failed) ||
      calls === null ||
      listed.error ||
      launched.error ||
      todo.error,
  };
}

// How far « À venir » looks ahead, and how many calls it shows.
const UPCOMING_DAYS = 60;
const UPCOMING_COUNT = 4;

/**
 * The next calls from `now` (« À venir » of the Calendrier): the ones the
 * viewer sees, soonest first; `mine` keeps those they work on. A call of an
 * archived project is left out, as in the calendar. Bounded to 60 days.
 */
export async function loadUpcomingCalls(
  access: Access,
  now: Date,
  mine: boolean,
): Promise<CallListItem[]> {
  const horizon = parisMidnight(addDays(parisPlace(now).day, UPCOMING_DAYS));
  try {
    const [calls, listed] = await Promise.all([
      listAllCalls(await createClient(), { range: { from: now, to: horizon } }),
      listProjects(),
    ]);
    const visible = new Set(listed.projects.map((p) => p.id));
    return calls
      .filter(
        (call) =>
          (call.projectId === null || visible.has(call.projectId)) &&
          (!mine ||
            (access.personId !== null &&
              call.ownerPersonId === access.personId)),
      )
      .toSorted((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .slice(0, UPCOMING_COUNT);
  } catch (error) {
    console.error("loadUpcomingCalls", error);
    return [];
  }
}
