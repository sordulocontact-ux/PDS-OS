import { routes } from "@/lib/auth/redirects";
import { DESIGN_STEPS } from "@/lib/design/journey";
import { conception } from "@/lib/i18n/fr/conception";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { projectReview } from "@/lib/i18n/fr/production";
import { shell } from "@/lib/i18n/fr/shell";

const fr = {
  shell,
  conception,
  projectReview,
  legalClearance,
  legalContracts,
  legalFormalities,
  legalForms,
  legalSplits,
};

// Navigation of a launched project — only one is ever shown (docs/DESIGN.md § 4):
// - true: the contextual sidebar right against the main one, collapsed to
//   icons (Figma "Double sidebar"), every section listed by group;
// - false: one row of tabs under the project header, like the other detail
//   pages (artist, title); the main sidebar keeps its width.
export const DOUBLE_SIDEBAR = true;

// Titled groups of the sidebar (ticket « Architecture globale », 08/10/2026:
// the business workflows run in parallel under one heading). The tabs ignore
// them: a tab bar has no headings.
export type ProjectSectionGroup = "workflows" | "steering";

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
  // Out of the navigation (decision C0, proto « Projet complet »): the page
  // keeps its route and its trail, reached from the steps that use it
  // (Équipe, Planning, Livrables, Fichiers).
  hidden?: boolean;
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
// Without `budget` (neither the owner nor the direction), the Budget is not
// listed at all (UX test of 09/10/2026: the creative director read it).
// `workflows`: the ones this project has (lib/workflow-status/rules.ts,
// from its data); all four when not given. `collective`: a collective
// project (lot 6 of docs/pds-mic-plan.md) has « Titres » right after its
// overview; no other project has it.
export function projectSections(
  projectId: string,
  {
    legal,
    budget = true,
    workflows = ["master", "legal", "marketing", "distribution"],
    collective = false,
  }: {
    legal: boolean;
    budget?: boolean;
    workflows?: readonly string[];
    collective?: boolean;
  },
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
      // Its own pages below: the Clôture du projet (ticket « Suivi & bilan »).
      match: (p) =>
        p === routes.project(projectId) ||
        below(routes.projectClosure(projectId))(p),
    },
    // What a collective holds, above its Cadrage and every workflow: its
    // titles, their artists and where each one stands.
    ...(collective
      ? [
          // Its titles, one entry and two views (Maël 25/11/2026): « Par
          // titre », the way into each one's journeys, and « Par artiste »
          // (/titles, until then « Titres et artistes »).
          {
            key: "tracks",
            label: t.tracks,
            href: routes.projectTracks(projectId),
            match: (p: string) =>
              below(routes.projectTracks(projectId))(p) ||
              below(routes.projectTitles(projectId))(p),
          },
          // Its releases (lot 13) are its Distribution's list since
          // 28/11/2026: the « Distribution » entry opens them (below).
          // Its titles' Plans de sortie (lot 14).
          {
            key: "release-plans",
            label: t.releasePlans,
            href: routes.projectReleasePlans(projectId),
            match: below(routes.projectReleasePlans(projectId)),
          },
        ]
      : []),
    // The Plan du projet is the Cadrage's fourth step (/framing/plan,
    // docs/ARCHITECTURE.md § 6 ter): no section of its own.
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
          routes.projectProduction(projectId),
          routes.projectActivations(projectId),
          routes.projectReview(projectId),
        ].some((href) => below(href)(p)),
      group: "workflows",
    },
    // A collective's Distribution is held release by release: its entry is
    // « Sorties », the list of its releases (mode, dates, UPC, each deposit),
    // lit on both (Sacha, 28/11/2026: it lit an entry of its own).
    collective
      ? {
          key: "distribution",
          label: t.distribution,
          href: routes.projectReleases(projectId),
          match: (p: string) =>
            below(routes.projectRelease(projectId))(p) ||
            below(routes.projectReleases(projectId))(p),
          group: "workflows" as const,
        }
      : section(
          "distribution",
          t.distribution,
          routes.projectRelease(projectId),
          "workflows",
        ),
    // Pilotage (proto): Travail, the project's Calls (the second door to
    // them, like Travail; Sacha 05/11/2026), Validations, Activité, then the
    // Budget (ticket MKT-S1-15).
    section("work", t.work, routes.projectWork(projectId), "steering"),
    // The Notes (calls and written notes); lit too on a call's pages, which
    // stay under /calls/<id>.
    {
      ...section("calls", t.calls, routes.projectNotes(projectId), "steering"),
      match: (p) =>
        below(routes.projectNotes(projectId))(p) ||
        below(routes.projectCalls(projectId))(p),
    },
    // The project's studio sessions (retour d'Ibé du 01/11/2026).
    section(
      "sessions",
      t.sessions,
      routes.projectSessions(projectId),
      "steering",
    ),
    section(
      "validations",
      t.validations,
      routes.projectValidations(projectId),
      "steering",
      "overview",
    ),
    ...(budget
      ? [
          section(
            "budget",
            t.budget,
            routes.projectBudget(projectId),
            "steering",
          ),
        ]
      : []),
    // Out of the navigation, routes kept (decision C0): each is reached from
    // the step that uses it; its trail still names it.
    ...(
      [
        ["team", t.team, routes.projectTeam(projectId)],
        ["planning", t.planning, routes.projectPlanning(projectId)],
        ["deliverables", t.deliverables, routes.projectDeliverables(projectId)],
        ["files", t.files, routes.projectFiles(projectId)],
      ] as const
    ).map(([key, label, href]) => ({
      ...section(key, label, href, "steering"),
      hidden: true,
    })),
  ];
  const workflowKeys = ["master", "legal", "marketing", "distribution"];
  return all.filter(
    (section) =>
      !workflowKeys.includes(section.key) || workflows.includes(section.key),
  );
}

export type ProjectCrumb = { label: string; href?: string };

// Title of a project page (Figma « PDS OS », node 76:3145): the name of the
// section it belongs to, nothing about the project (the switcher of the
// sidebar names it). A page opened from inside a section rather than from
// its chevrons — a branch of the Juridique, the Brief de cadrage — adds its own name after the section's, which becomes a link:
// the trail replaces the « ← … » links those pages had. The steps of a
// workflow (Mixage, Plan d'action…) add nothing: their chevrons name them.
// The last crumb is the page's h1; none outside every section.
export function projectTrail(
  projectId: string,
  pathname: string,
  sections: ProjectSection[],
): ProjectCrumb[] {
  const section = sections.find((item) => item.match(pathname));
  if (!section) return [];

  const home = { label: section.label, href: section.href };
  const legal = routes.projectLegal(projectId);
  // A branch of the Juridique opens from an action of the Suivi:
  // the trail goes back through it.
  const plan = {
    label: fr.shell.project.legalSteps.tracking,
    href: routes.projectLegalStep(projectId, "tracking"),
  };
  const conception = {
    label: fr.conception.title,
    href: routes.projectDesign(projectId),
  };
  const subPages: Record<string, ProjectCrumb[]> = {
    // Vue d'ensemble › Clôture du projet, apart from the Marketing closing.
    [routes.projectClosure(projectId)]: [{ label: fr.projectReview.title }],
    [`${legal}/forms`]: [plan, { label: fr.legalForms.page.title }],
    [`${legal}/contracts`]: [
      plan,
      { label: fr.legalContracts.agreements.title },
    ],
    [`${legal}/splits`]: [plan, { label: fr.legalSplits.page.title }],
    [`${legal}/clearances`]: [plan, { label: fr.legalClearance.page.title }],
    [`${legal}/formalities`]: [plan, { label: fr.legalFormalities.page.title }],
    // Marketing › Conception (proto « Projet complet »): the open step ends
    // the trail (ProjectHeader `steps`), « Conception » before it.
    [routes.projectDesign(projectId)]: [{ label: fr.conception.title }],
    ...Object.fromEntries(
      DESIGN_STEPS.map((step) => [
        routes.projectDesignStep(projectId, step),
        [conception],
      ]),
    ),
  };
  // One Fiche Livrable: its own page below the list.
  const sheets = routes.projectDesignSheets(projectId);
  if (pathname.startsWith(`${sheets}/`))
    return [
      home,
      conception,
      { label: fr.conception.tabs.sheets, href: sheets },
      { label: fr.conception.sheetTitle },
    ];
  const below = subPages[pathname];
  return below ? [home, ...below] : [{ label: section.label }];
}

/** A sub-module pill as the server computes it (lib/ui/marketing-steps.ts). */
export type SubModuleStep = {
  key: string;
  label: string;
  href: string;
  built: boolean;
  title?: string;
  done?: boolean;
  // Other pages it covers, and every page below its own when `nested`.
  also?: string[];
  nested?: boolean;
};

/** Whether `pathname` belongs to this sub-module. */
export const isSubModuleAt = (step: SubModuleStep, pathname: string) =>
  pathname === step.href ||
  !!step.also?.includes(pathname) ||
  (!!step.nested && pathname.startsWith(`${step.href}/`));

// The head of a launched project's page (proto « Projet complet »,
// docs/DESIGN.md § 4, « En-tête de module »): the trail starts with the
// section (the module), then — in the Marketing — the
// sub-module, then the sub-pages projectTrail knows. The h1 is the module:
// the section's name, or the Marketing's sub-module. A page adds its step
// (the last crumb) itself (components/projects/project-header.tsx).
export function moduleTrail(
  projectId: string,
  pathname: string,
  sections: ProjectSection[],
  { subModules = [] }: { subModules?: SubModuleStep[] },
): { crumbs: ProjectCrumb[]; title: string } {
  const section = sections.find((item) => item.match(pathname));
  if (!section) return { crumbs: [], title: "" };
  const head = { label: section.label, href: section.href };
  let rest = projectTrail(projectId, pathname, sections).slice(1);
  let title = section.label;
  const sub = subModules.find((step) => isSubModuleAt(step, pathname));
  if (sub) {
    title = sub.label;
    if (rest[0]?.label !== sub.label)
      rest = [{ label: sub.label, href: sub.href }, ...rest];
  }
  // No project crumb: the project's sidebar names it (Figma, Sacha 29/10).
  return { crumbs: [head, ...rest], title };
}
