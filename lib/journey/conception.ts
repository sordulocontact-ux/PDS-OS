import "server-only";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadConception } from "@/lib/design/conception";
import {
  JOURNEY_STEPS,
  journey,
  type JourneyStepState,
} from "@/lib/design/journey";
import { loadJourneyInput } from "@/lib/design/journey-data";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { isStageValidated, personName } from "@/lib/projects/types";
import type { JourneyStatus, JourneyStep } from "@/lib/ui/journey";

import type { ModuleJourney } from "./types";

const STATUS: Record<JourneyStepState, JourneyStatus> = {
  done: "done",
  current: "current",
  todo: "upcoming",
  // Passed over on purpose (« Commencer sans échange »): closed.
  skipped: "done",
};

/**
 * The Conception's journey (lib/design/journey.ts, MKT-C2-03) as the common
 * JourneyStep[] for the project's « Maintenant »: its six steps, and its one
 * next action given to the viewer on the first open step. A bridge until the
 * Conception moves onto the common frame (zone « design »); nothing before
 * the Stratégie is validated or the Conception started.
 */
export async function conceptionJourney(
  projectId: string,
): Promise<ModuleJourney[]> {
  const [access, project] = await Promise.all([
    requireApproved(),
    getProject(projectId),
  ]);
  if (!project || !isStageValidated(project.stages, "launch_strategy"))
    return [];
  const data = await loadConception(project, access);
  if (!data?.started) return [];
  const sheets = await loadSheetSummaries(projectId);
  const input = await loadJourneyInput(
    { id: project.id, title: project.title, artistName: project.artistName },
    access,
    data,
    sheets,
  );
  const path = journey(input);
  const action = path.next.kind === "action" ? path.next.action : null;
  const first = path.steps.find((s) => s.state === "current")?.key;
  const viewer =
    personName(access.firstName ?? "", access.lastName ?? "") ||
    (project.ownerName ?? "—");
  const home = routes.projectDesign(projectId);
  const steps: JourneyStep[] = path.steps.map((s, index) => {
    const acts = action !== null && s.key === first;
    return {
      key: s.key,
      href: acts ? action.href : `${home}#${s.key}`,
      title: fr.conceptionJourney.steps[s.key],
      why: s.summary,
      status: STATUS[s.state],
      owner: null,
      validator: null,
      prereq: index > 0 ? [JOURNEY_STEPS[index - 1]] : [],
      next: index < JOURNEY_STEPS.length - 1 ? [JOURNEY_STEPS[index + 1]] : [],
      actor: acts
        ? {
            name: viewer,
            viewer: true,
            viaLink: false,
            todo: action.label,
            kind: s.key === "validate" ? "validate" : "do",
          }
        : null,
      summary: s.summary,
    };
  });
  return [
    {
      module: "marketing",
      label: fr.shell.project.sidebar.marketing,
      part: {
        key: "design",
        label: fr.shell.project.marketingSteps.conception,
      },
      steps,
    },
  ];
}
