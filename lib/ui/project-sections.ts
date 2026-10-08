import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Navigation of a launched project — only one is ever shown (docs/DESIGN.md § 4):
// - true: the contextual sidebar right against the main one, collapsed to
//   icons (Figma "Double sidebar"), every section listed by group;
// - false: one row of tabs under the project header, like the other detail
//   pages (artist, title); the main sidebar keeps its width.
export const DOUBLE_SIDEBAR = true;

// Titled groups of the sidebar (ticket « Architecture globale », 08/10/2026:
// the business workflows run in parallel under one heading). The tabs ignore
// them: a tab bar has no headings.
export type ProjectSectionGroup = "workflows" | "steering" | "production";

export type ProjectSection = {
  key: string;
  label: string;
  href: string;
  // Active on this page and everything below it.
  match: (pathname: string) => boolean;
  // Heading it sits under in the sidebar; none for the overview and the
  // Cadrage, which stand above the workflows.
  group?: ProjectSectionGroup;
  // Listed but closed to this viewer (the Juridique without manage_legal):
  // greyed with its reason, never a link; the page itself still answers 404.
  restricted?: boolean;
  // With tabs, a section consulted rarely has no tab of its own: it is
  // listed on its parent tab's page (the overview), which stays lit while it
  // is open.
  tabParent?: string;
};

const below =
  (href: string) =>
  (pathname: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

// Every section of a launched project, each with its page (ticket
// « Architecture globale », 08/10/2026): the overview, the Cadrage above
// every workflow, then the four workflows in parallel — Master, Juridique,
// Marketing (Stratégie, Conception, Activations: lib/ui/marketing-steps.ts)
// and Distribution (the Sortie) — then the steering tools. Shared by the
// sidebar and the tabs, so both list the same sections in the same order.
// Without manage_legal (`legal`), the Juridique is listed as restricted.
// `workflows`: the ones this project has (lib/workflow-status/rules.ts,
// from its data); all four when not given.
export function projectSections(
  projectId: string,
  {
    legal,
    workflows = ["master", "legal", "marketing", "distribution"],
  }: { legal: boolean; workflows?: readonly string[] },
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

  const all: ProjectSection[] = [
    {
      key: "overview",
      label: t.overview,
      href: routes.project(projectId),
      match: (p) => p === routes.project(projectId),
    },
    // No section for the Plan du Projet: it is the overview itself once the
    // Brief is validated (docs/ARCHITECTURE.md § 6 ter).
    {
      key: "framing",
      label: t.framing,
      href: routes.projectFraming(projectId),
      match: below(routes.projectFraming(projectId)),
    },
    section("master", t.master, routes.projectMaster(projectId), "workflows"),
    {
      ...section("legal", t.legal, routes.projectLegal(projectId), "workflows"),
      restricted: !legal,
    },
    {
      key: "marketing",
      label: t.marketing,
      href: routes.projectStrategy(projectId),
      match: (p) =>
        [
          routes.projectStrategy(projectId),
          routes.projectDesign(projectId),
          routes.projectActivations(projectId),
        ].some((href) => below(href)(p)),
      group: "workflows",
    },
    section(
      "distribution",
      t.distribution,
      routes.projectRelease(projectId),
      "workflows",
    ),
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
  const workflowKeys = ["master", "legal", "marketing", "distribution"];
  return all.filter(
    (section) =>
      !workflowKeys.includes(section.key) || workflows.includes(section.key),
  );
}
