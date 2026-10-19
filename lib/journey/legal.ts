import "server-only";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { isWorkflowLaunched } from "@/lib/plan/queries";

import type { ModuleJourney } from "./types";

/**
 * The Juridique's journey for loadProjectJourneys (docs/ARCHITECTURE.md
 * § 3 ter, § 8 sexies): the Dossier, each démarche of the plan as a step,
 * « Prêt pour la sortie » (lib/legal/journey.ts), for manage_legal only.
 * The project's responsible does the gestures; the direction sees « À
 * vous » only on its decisions (`kind: "validate"`). Nothing while the
 * Plan du projet has not launched it: the module is locked, so neither the
 * « Maintenant » nor the badges may point to a step it refuses (recette).
 */
export async function legalJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  const access = await requireApproved();
  if (!can(access, "manage_legal")) return [];
  if (!(await isWorkflowLaunched(projectId, "legal"))) return [];
  const { steps } = await legalJourneyContext(projectId);
  return [{ module: "legal", label: fr.shell.project.sidebar.legal, steps }];
}
