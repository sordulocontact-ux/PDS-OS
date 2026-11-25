import "server-only";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { distributionContext } from "@/lib/distribution/journey-context";
import { fr } from "@/lib/i18n/fr";
import {
  placeOf,
  type ModuleJourney,
  type ProjectAction,
  type ProjectJourneys,
} from "@/lib/journey/types";
import { withTitre } from "@/lib/legal/title-groups";
import { legalTitleLayout } from "@/lib/legal/title-layout";
import { masterTitleJourney } from "@/lib/master-workflow/journey-context";
import { workflowCards, type WorkflowCard } from "@/lib/overview/cards";
import { trackedCache } from "@/lib/projects/live-deps";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import { loadTitleDeposits } from "@/lib/release/collective-releases";
import type { JourneyStep } from "@/lib/ui/journey";
import { workflowSteps } from "@/lib/ui/workflow-hrefs";
import { loadWorkflowStates } from "@/lib/workflow-status/load";
import type { WorkflowKey, WorkflowState } from "@/lib/workflow-status/rules";

/**
 * A collective's titles, each with its own journeys (Maël 25/11/2026: the
 * title as the way in, « le parcours qui a besoin d'être fait pour un titre,
 * le même que sur un projet non MIC »). The workflows worked title by title
 * — the Master (its master's journey, lot 8), the Juridique (its scope,
 * « 1 par son ») and the Distribution (its release, or the compilation it
 * goes out with, lot 15) — read from what each workflow already computes,
 * never stored; then the same cards as a project's « Progression »
 * (workflowCards) and its actions for « Maintenant ». The Cadrage and the
 * Marketing stay the project's. Each step keeps the title in its address
 * (`?titre=`, `?sortie=`), so a card opens the workflow on this title.
 */

/** The workflows a title has a journey of, in the overview's order. */
export const TITLE_WORKFLOWS = ["master", "legal", "distribution"] as const;

export type TitleProgress = {
  title: ProjectTitle;
  // Its name in the project (« Titre de Jay (à nommer) »).
  label: string;
  // The artists it invites, still in play.
  guests: string[];
  abandoned: boolean;
  // Its Distribution is the compilation's (no release of its own): what is
  // done there is done for every title of the compilation.
  withCompilation: boolean;
  journeys: ProjectJourneys;
  // One per workflow of the project worked by title; none for an abandoned
  // title (out of every workflow, lot 9).
  cards: WorkflowCard[];
};

/** What every title's journeys share, read once per request. */
const titlesContext = trackedCache(async (projectId: string) => {
  const [access, flows, titles, deposits] = await Promise.all([
    requireApproved(),
    loadWorkflowStates(projectId),
    loadProjectTitles(projectId),
    loadTitleDeposits(projectId),
  ]);
  const workflows: WorkflowKey[] = TITLE_WORKFLOWS.filter((w) =>
    (flows?.workflows ?? []).includes(w),
  );
  const legal = can(access, "manage_legal");
  const layout =
    legal && workflows.includes("legal")
      ? await legalTitleLayout(projectId)
      : null;
  return { workflows, titles, deposits, legal, layout };
});

/** One title's journeys and cards; null: not a title of the project. */
export const loadTitleProgress = trackedCache(
  async (projectId: string, titleId: string): Promise<TitleProgress | null> => {
    const ctx = await titlesContext(projectId);
    const title = ctx.titles.find((t) => t.id === titleId);
    if (!title) return null;
    const guests = titleGuestNames(title.participations);
    const label = labelOf(title);
    const abandoned = title.status === "abandoned";
    const deposit = ctx.deposits[title.id];
    const withCompilation =
      ctx.workflows.includes("distribution") &&
      Boolean(deposit?.withCompilation);
    const base = { title, label, guests, abandoned, withCompilation };
    if (abandoned)
      return {
        ...base,
        journeys: { journeys: [], mine: [], waiting: [], validations: [] },
        cards: [],
      };

    const names = fr.shell.project.sidebar;
    const [master, distribution] = await Promise.all([
      ctx.workflows.includes("master") && title.master
        ? masterTitleJourney(projectId, title.master.id)
        : null,
      ctx.workflows.includes("distribution") && deposit
        ? distributionContext(projectId, deposit.releaseId)
        : null,
    ]);
    const legal =
      ctx.layout?.scopes.find((scope) => scope.titleId === title.id)?.steps ??
      null;
    const journeys: ModuleJourney[] = [
      ...(master && title.master
        ? [
            {
              module: "master" as const,
              label: names.master,
              steps: keepTitre(master, title.master.id),
            },
          ]
        : []),
      ...(legal && legal.length > 0
        ? [{ module: "legal" as const, label: names.legal, steps: legal }]
        : []),
      ...(distribution && distribution.steps.length > 0
        ? [
            {
              module: "distribution" as const,
              label: names.distribution,
              steps: distribution.steps,
            },
          ]
        : []),
    ];
    const gathered = gather(journeys);
    const states = Object.fromEntries(
      ctx.workflows.map((workflow) => [
        workflow,
        workflow === "legal" && !ctx.legal
          ? ("restricted" as const)
          : stateOf(
              workflow,
              journeys.find((j) => j.module === workflow)?.steps ?? [],
            ),
      ]),
    );
    return {
      ...base,
      journeys: gathered,
      // A card opens the workflow at the top of its step, not scrolled down
      // to the viewer's gesture (`#a-vous`, kept for « Maintenant »'s « Ouvrir
      // l'étape »): Maël 25/11/2026. The Distribution of a title going out
      // with the compilation says it is the compilation's.
      cards: workflowCards({
        projectId,
        workflows: ctx.workflows,
        states,
        journeys: gathered,
      }).map((card) =>
        card.restricted
          ? card
          : {
              ...card,
              href: card.href.split("#")[0],
              ...(card.workflow === "distribution" && withCompilation
                ? { scope: fr.titleTracks.page.withCompilation }
                : {}),
            },
      ),
    };
  },
);

/** The project's titles to switch to (the trail of a title's page), in
 * its order, the abandoned ones last. */
export const loadTitleChoices = trackedCache(async (projectId: string) => {
  const { titles } = await titlesContext(projectId);
  return titles.map((title) => ({
    id: title.id,
    label: labelOf(title),
    status: title.status,
  }));
});

/** Every title's journeys, in the project's order (abandoned ones last). */
export const loadTitlesProgress = trackedCache(
  async (projectId: string): Promise<TitleProgress[]> => {
    const { titles } = await titlesContext(projectId);
    const all = await Promise.all(
      titles.map((title) => loadTitleProgress(projectId, title.id)),
    );
    return all.filter((row): row is TitleProgress => row !== null);
  },
);

/** A title's name in the project (« Titre de Jay (à nommer) »). */
function labelOf(title: ProjectTitle): string {
  return projectTitleLabel({
    position: title.position,
    workingTitle: title.workingTitle,
    masterTitle: masterNameOf(title.master),
    artists: titleGuestNames(title.participations),
  });
}

/** The Master's steps of one title keep it in their address (as
 * MasterStepFrame does), the actor's link too. */
function keepTitre(steps: JourneyStep[], masterId: string): JourneyStep[] {
  return steps.map((step) => ({
    ...step,
    href: withTitre(step.href, masterId),
    actor: step.actor?.href
      ? { ...step.actor, href: withTitre(step.actor.href, masterId) }
      : step.actor,
  }));
}

/** A workflow's state for the cards, from the title's own steps: done when
 * every step is; not started without any (no master yet, no release yet,
 * nothing of its own in the Juridique): its first chevron. */
function stateOf(workflow: WorkflowKey, steps: JourneyStep[]): WorkflowState {
  const first = workflowSteps(workflow)[0]?.key ?? "";
  const finished =
    steps.length > 0 &&
    steps.every((s) => s.status === "done" || s.status === "obsolete");
  return {
    workflow,
    status:
      steps.length === 0 ? "not_started" : finished ? "done" : "in_progress",
    step: first,
    reason: "",
    progress: "",
    done: [],
  };
}

/** The title's actions: the viewer's, then what others are expected to do
 * (as loadShellJourneys gathers a project's). */
function gather(journeys: ModuleJourney[]): ProjectJourneys {
  const actions: ProjectAction[] = journeys.flatMap((journey) =>
    journey.steps
      .filter((step) => step.actor)
      .map((step) => ({
        module: journey.module,
        place: placeOf(journey),
        part: journey.part?.key,
        step,
      })),
  );
  const mine = actions.filter((a) => a.step.actor?.viewer);
  return {
    journeys,
    mine,
    waiting: actions.filter((a) => !a.step.actor?.viewer),
    validations: mine.filter((a) => a.step.actor?.kind === "validate"),
  };
}
