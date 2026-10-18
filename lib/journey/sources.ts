import "server-only";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { journeyContext } from "@/lib/production/journey/context";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

import { conceptionJourney } from "./conception";
import type { JourneyModuleKey, ModuleJourney } from "./types";

// One loader per workflow (docs/ARCHITECTURE.md § 3 ter): each returns the
// project's journeys of that workflow as JourneyStep[], read with the
// viewer's session, and nothing when the viewer may not read it. The zones
// fill the empty ones as they move onto the common frame (Cadrage, Master,
// Distribution, Stratégie, Activations, Suivi & bilan).
type Loader = (projectId: string) => Promise<ModuleJourney[]>;

const label = fr.shell.project.sidebar;
const parts = fr.shell.project.marketingSteps;

// Juridique: its five steps (lib/legal/journey.ts), manage_legal only.
const legal: Loader = async (projectId) => {
  const access = await requireApproved();
  if (!can(access, "manage_legal")) return [];
  const { steps } = await legalJourneyContext(projectId);
  return [{ module: "legal", label: label.legal, steps }];
};

// Marketing: each deliverable's Production once its sheet is opened, and the
// Conception (lib/journey/conception.ts). Stratégie, Activations and Suivi &
// bilan come with their zone.
const marketing: Loader = async (projectId) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_sheets")
    .select("deliverable_id")
    .eq("project_id", projectId);
  if (error) console.error("loadProjectJourneys production:", error.message);
  const [design, ...productions] = await Promise.all([
    conceptionJourney(projectId),
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
  return [...design, ...productions.flat()];
};

// Filled by their zone (C4: typed, empty until then).
const none: Loader = async () => [];

export const JOURNEY_LOADERS: Record<JourneyModuleKey, Loader> = {
  framing: none,
  marketing,
  master: none,
  legal,
  distribution: none,
};

/** Whether the project's workflows are launched at all (no journeys before). */
export async function isLaunched(projectId: string): Promise<boolean> {
  const project = await getProject(projectId);
  return Boolean(project && project.stages.length > 0);
}
