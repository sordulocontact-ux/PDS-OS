import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import { todayInParis } from "@/lib/insights/dates";
import type { ProjectListItem } from "@/lib/projects/types";
import { trackedCache } from "@/lib/projects/live-deps";
import { loadLaunchedJourneys, loadMyJourneyWork } from "@/lib/work/journeys";
import { loadMyWork } from "@/lib/work/queries";
import { isMine, leadOf, workRowsOf, type WorkRow } from "@/lib/work/rows";

const fr = { shell };

/** Someone else's move the viewer waits for (« Ce que vous attendez »). */
export type WaitingItem = {
  key: string;
  // Null when nobody is named yet (a date, a role still to choose).
  who: string | null;
  viaLink: boolean;
  todo: string;
  projectTitle: string;
  place: string;
  due: string | null;
  overdue: boolean;
  href: string;
};

/** One line of « Vos projets »: the most pressing of the viewer's moves in
 * it (`leadOf`, the same rows as Travail) and how many there are. */
export type HomeProject = {
  project: ProjectListItem;
  next: WorkRow | null;
  mine: number;
};

export type HomeFeed = {
  // « Maintenant » (the same choice as the Travail's lead).
  lead: WorkRow | null;
  // The viewer's other moves, in the Travail's order.
  also: WorkRow[];
  waiting: WaitingItem[];
  projects: HomeProject[];
  // A read failed: said, never shown as « nothing ».
  error: boolean;
};

// Overdue first, then the earliest due date, undated last.
const byWhen = (a: WaitingItem, b: WaitingItem) =>
  Number(b.overdue) - Number(a.overdue) ||
  (a.due ?? "9999").localeCompare(b.due ?? "9999");

const viewerNameOf = (access: Access) =>
  [access.firstName, access.lastName].filter(Boolean).join(" ");

/**
 * The home (docs/VISION-UX.md § 2 and § 4, proto `docs/protos/accueil.html`):
 * « Maintenant » and the viewer's other moves are the Travail's rows
 * (lib/work/rows.ts); « Ce que vous attendez » is the journeys' `waiting`
 * of the projects the viewer answers for — every project for the direction,
 * the projects they run, the steps they will validate — plus the projects
 * waiting for a project manager's acceptance. No list of its own: the same
 * sources as Travail, read once per request.
 */
export const loadHomeFeed = trackedCache(
  async (access: Access): Promise<HomeFeed> => {
    const [work, journeys, launched] = await Promise.all([
      loadMyWork(access),
      loadMyJourneyWork(),
      loadLaunchedJourneys(),
    ]);
    const rows = workRowsOf(work, journeys, todayInParis());
    const lead = leadOf(rows);
    const mine = rows.filter(isMine);
    const me = access.personId;
    const direction = can(access, "assign_projects");
    const viewerName = viewerNameOf(access);

    const waiting: WaitingItem[] = launched.projects.flatMap(
      ({ project, journeys: j }) => {
        const runs = direction || project.ownerPersonId === me;
        return j.waiting
          .filter(
            ({ step }) =>
              runs ||
              (viewerName !== "" &&
                (step.validator?.name === viewerName ||
                  step.roles?.some(
                    (r) => r.kind === "valid" && r.name === viewerName,
                  ))),
          )
          .map((a): WaitingItem => ({
            key: `${project.id}|${a.place}|${a.step.key}`,
            who: a.step.actor?.name ?? null,
            viaLink: a.step.actor?.viaLink ?? false,
            todo: a.step.actor?.todo ?? a.step.title,
            projectTitle: project.title,
            place: `${a.place} › ${a.step.title}`,
            due: a.step.due ?? null,
            overdue: a.step.alert === "overdue",
            href: a.step.href,
          }));
      },
    );
    for (const p of work.awaitingAcceptance)
      waiting.push({
        key: `awaiting|${p.id}`,
        who: p.responsibleName,
        viaLink: false,
        todo: fr.shell.home.waiting.accept,
        projectTitle: p.title,
        place: fr.shell.home.waiting.launch,
        due: null,
        overdue: false,
        href: routes.project(p.id),
      });
    waiting.sort(byWhen);

    // « Vos projets »: every project for the direction; else those the
    // viewer answers for, acts in or waits on. Drafts never transmitted
    // stay in Projets.
    const mineByProject = new Map<string, WorkRow[]>();
    for (const row of mine)
      mineByProject.set(row.projectId, [
        ...(mineByProject.get(row.projectId) ?? []),
        row,
      ]);
    const waitedIn = new Set(
      launched.projects
        .filter(({ journeys: j }) =>
          waiting.some((w) => j.waiting.some((a) => w.href === a.step.href)),
        )
        .map(({ project }) => project.id),
    );
    const listed = [
      ...launched.projects.map(({ project }) => project),
      ...work.toAccept,
      ...work.toRetransmit,
      ...work.awaitingAcceptance,
    ];
    const seen = new Set<string>();
    const projects: HomeProject[] = listed
      .filter((p) => !seen.has(p.id) && Boolean(seen.add(p.id)))
      .filter(
        (p) =>
          direction ||
          p.responsiblePersonId === me ||
          mineByProject.has(p.id) ||
          waitedIn.has(p.id),
      )
      .map((project) => {
        const own = mineByProject.get(project.id) ?? [];
        return { project, next: leadOf(own), mine: own.length };
      })
      .sort(
        (a, b) =>
          (a.project.dueDate ?? "9999").localeCompare(
            b.project.dueDate ?? "9999",
          ) || a.project.title.localeCompare(b.project.title, "fr"),
      );

    return {
      lead,
      also: mine.filter((row) => row.key !== lead?.key),
      waiting,
      projects,
      error: work.error || journeys.error || launched.error,
    };
  },
);
