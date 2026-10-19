import "server-only";

import { fr } from "@/lib/i18n/fr";
import { journeyContext } from "@/lib/production/journey/context";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

import { activationsJourneys } from "./activations";
import { designJourneys } from "./design";
import { distributionJourneys } from "./distribution";
import { framingJourneys } from "./framing";
import { legalJourneys } from "./legal";
import { masterJourneys } from "./master";
import { strategyJourneys } from "./strategy";
import { reviewJourneys } from "./review";
import type { JourneyModuleKey, ModuleJourney } from "./types";

// One loader per workflow (docs/ARCHITECTURE.md § 3 ter): each returns the
// project's journeys of that workflow as JourneyStep[], read with the
// viewer's session, and nothing when the viewer may not read it. The zones
// fill the empty ones as they move onto the common frame (Cadrage, Master,
// Distribution, Stratégie, Activations, Suivi & bilan).
type Loader = (projectId: string) => Promise<ModuleJourney[]>;

const label = fr.shell.project.sidebar;
const parts = fr.shell.project.marketingSteps;

// Marketing: the Stratégie (lib/journey/strategy.ts), the Conception
// (lib/journey/design.ts), each deliverable's Production once its sheet is
// opened, the Activations (lib/journey/activations.ts) and the Suivi & bilan
// (lib/journey/review.ts).
const marketing: Loader = async (projectId) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_sheets")
    .select("deliverable_id")
    .eq("project_id", projectId);
  if (error) console.error("loadProjectJourneys production:", error.message);
  const [strategy, design, review, activations, ...productions] =
    await Promise.all([
      strategyJourneys(projectId),
      designJourneys(projectId),
      reviewJourneys(projectId),
      activationsJourneys(projectId),
      ...(data ?? []).map(async ({ deliverable_id: id }) => {
        const ctx = await journeyContext(projectId, id);
        const started = Boolean(
          ctx.data.heritage.fiche || ctx.data.heritage.source,
        );
        return started
          ? [
              {
                module: "marketing" as const,
                label: label.marketing,
                part: {
                  key: `production:${id}`,
                  label: `${parts.production} › ${ctx.data.deliverable.title}`,
                },
                steps: ctx.steps,
              },
            ]
          : [];
      }),
    ]);
  return [
    ...strategy,
    ...design,
    ...productions.flat(),
    ...activations,
    ...review,
  ];
};

// Filled by their zone (C4: typed, empty until then).
const none: Loader = async () => [];

export const JOURNEY_LOADERS: Record<JourneyModuleKey, Loader> = {
  framing: framingJourneys,
  marketing,
  master: masterJourneys,
  legal: legalJourneys,
  distribution: distributionJourneys,
};

/** Whether the project's workflows are launched at all (no journeys before). */
export async function isLaunched(projectId: string): Promise<boolean> {
  const project = await getProject(projectId);
  return Boolean(project && project.stages.length > 0);
}
