import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Navigation of a launched project — only one is ever shown (docs/DESIGN.md § 4):
// - true: the contextual sidebar right against the main one, collapsed to
//   icons (Figma "Double sidebar"), every section listed by group;
// - false: one row of tabs under the project header, like the other detail
//   pages (artist, title); the main sidebar keeps its width.
export const DOUBLE_SIDEBAR = false;

// Titled groups of the sidebar (Figma "PDS OS", node 1510:3096). The tabs
// ignore them: a tab bar has no headings.
export type ProjectSectionGroup = "process" | "steering" | "production";

export type ProjectSection = {
  key: string;
  label: string;
  href: string;
  // Active on this page and everything below it.
  match: (pathname: string) => boolean;
  // Heading it sits under in the sidebar; none for the overview.
  group?: ProjectSectionGroup;
  // With tabs, a section consulted rarely has no tab of its own: it is
  // listed on its parent tab's page (the overview), which stays lit while it
  // is open.
  tabParent?: string;
};

const below =
  (href: string) =>
  (pathname: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

// Every section of a launched project, in the Figma order, each with its page.
// Workflow covers Cadrage/Stratégie/Conception/Sortie, entered through
// Cadrage; Master and Juridique are the two other processes. Shared by the
// sidebar and the tabs, so both list the same sections in the same order.
// Juridique is listed only for a viewer holding manage_legal (`legal`).
export function projectSections(
  projectId: string,
  { legal }: { legal: boolean },
): ProjectSection[] {
  const t = fr.shell.project.sidebar;
  const section = (
    key: string,
    label: string,
    href: string,
    group: ProjectSectionGroup,
    tabParent?: string,
  ): ProjectSection => ({
    key,
    label,
    href,
    match: below(href),
    group,
    tabParent,
  });

  return [
    {
      key: "overview",
      label: t.overview,
      href: routes.project(projectId),
      match: (p) => p === routes.project(projectId),
    },
    {
      key: "workflow",
      label: t.workflow,
      href: routes.projectFraming(projectId),
      match: (p) =>
        [
          routes.projectFraming(projectId),
          routes.projectStrategy(projectId),
          routes.projectDesign(projectId),
          routes.projectRelease(projectId),
        ].some((href) => below(href)(p)),
      group: "process",
    },
    // The Plan du Projet, once the Brief is validated: what starts, what
    // follows, what runs in parallel (docs/ARCHITECTURE.md § 6 ter).
    section(
      "plan",
      t.plan,
      routes.projectPlan(projectId),
      "process",
      "overview",
    ),
    section("master", t.master, routes.projectMaster(projectId), "process"),
    ...(legal
      ? [section("legal", t.legal, routes.projectLegal(projectId), "process")]
      : []),
    section("work", t.work, routes.projectWork(projectId), "steering"),
    section(
      "team",
      t.team,
      routes.projectTeam(projectId),
      "steering",
      "overview",
    ),
    section(
      "planning",
      t.planning,
      routes.projectPlanning(projectId),
      "steering",
    ),
    section("budget", t.budget, routes.projectBudget(projectId), "steering"),
    section("calls", t.calls, routes.projectCalls(projectId), "production"),
    section(
      "deliverables",
      t.deliverables,
      routes.projectDeliverables(projectId),
      "production",
    ),
    section(
      "activations",
      t.activations,
      routes.projectActivations(projectId),
      "production",
      "overview",
    ),
    section("files", t.files, routes.projectFiles(projectId), "production"),
    section(
      "validations",
      t.validations,
      routes.projectValidations(projectId),
      "production",
      "overview",
    ),
    section(
      "activity",
      t.activity,
      routes.projectActivity(projectId),
      "production",
      "overview",
    ),
  ];
}
