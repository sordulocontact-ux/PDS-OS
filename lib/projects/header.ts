import "server-only";

import { cache } from "react";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  canEditProject,
  canSeeProjectBudget,
} from "@/lib/projects/edit-access";
import { projectKindLabel } from "@/lib/projects/labels";
import { getProject } from "@/lib/projects/queries";
import { distributionSteps } from "@/lib/ui/distribution-steps";
import { marketingSteps } from "@/lib/ui/marketing-steps";
import { masterSteps } from "@/lib/ui/master-steps";
import type { ModuleFact } from "@/lib/ui/module-frame";
import type { SubModuleStep } from "@/lib/ui/project-sections";
import { formatDay } from "@/lib/utils/day";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

export type ProjectHeaderData = {
  projectId: string;
  projectTitle: string;
  // What projectSections needs to list this viewer's sections.
  sections: { legal: boolean; budget: boolean; workflows?: string[] };
  // The Marketing's sub-modules (pills), checked from the project's stages.
  subModules: SubModuleStep[];
  // The project's own facts (proto « Projet complet »): « Néons · Mona Lys ·
  // Single », Budget, Responsable, Sortie. A module adds or replaces them.
  facts: ModuleFact[];
  // The steps of the Master and the Distribution, which lost their chevrons
  // (C0): the open one ends the trail until their journey does.
  steps: Array<{ href: string; title: string }>;
  // « Ajouter une dépense » on the Marketing's pages (MKT-S1-15).
  canAddExpense: boolean;
};

const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Everything the head of a launched project's page needs (ModuleHeader
 * through components/projects/project-header.tsx), read once per request:
 * the project, its workflows' states and the viewer's access are already
 * cached and shared with the layout and the overview.
 */
export const projectHeaderData = cache(
  async (projectId: string): Promise<ProjectHeaderData | null> => {
    const [access, project] = await allInOrder([
      requireApproved(),
      getProject(projectId),
    ]);
    if (!project) return null;
    const flows = await loadWorkflowStates(project.id);
    const marketing = flows?.states.marketing;
    const marketingState =
      marketing && marketing !== "restricted" ? marketing : null;
    const budget = canSeeProjectBudget(access, project);
    const t = fr.moduleFrame.facts;
    const release = flows?.details.releaseDate ?? project.dueDate;
    const facts: ModuleFact[] = [
      {
        key: "project",
        value: [
          project.title,
          project.artistName,
          projectKindLabel({
            type: project.type,
            musicFormat: project.musicFormat,
            contentFormatName: project.contentFormat?.name ?? null,
          }),
        ]
          .filter(Boolean)
          .join(" · "),
      },
    ];
    if (budget && project.budgetCents !== null)
      facts.push({
        key: "budget",
        label: t.budget,
        value: t.budgetValue(euros.format(project.budgetCents / 100)),
      });
    if (project.ownerName)
      facts.push({ key: "owner", label: t.owner, value: project.ownerName });
    if (release)
      facts.push({
        key: "release",
        label:
          project.type === "music_release"
            ? t.release
            : fr.shell.projectDate.other,
        value: formatDay(release),
      });
    return {
      projectId: project.id,
      projectTitle: project.title,
      sections: {
        legal: can(access, "manage_legal"),
        budget,
        workflows: flows?.workflows,
      },
      subModules: marketingSteps(project.id, {
        strategyLaunched:
          (marketingState?.status ?? "not_started") !== "not_started",
        validatedStages: [
          ...project.stages
            .filter((stage) => stage.state === "validated")
            .map((stage) => stage.key),
          // The Conception is done once every sheet is transferred.
          ...(marketingState?.done.includes("conception") ? ["design"] : []),
        ],
        marketingClosed: marketingState?.done.includes("review") ?? false,
      }),
      facts,
      steps: [...masterSteps(project.id), ...distributionSteps(project.id)].map(
        (step) => ({ href: step.href, title: step.label }),
      ),
      canAddExpense: budget && canEditProject(access, project),
    };
  },
);
