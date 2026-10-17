import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadConfirmation } from "@/lib/legal/confirmation/queries";
import { loadIntake } from "@/lib/legal/intake/queries";
import { loadLegalInventory } from "@/lib/legal/inventory";
import { legalJourney } from "@/lib/legal/journey";
import { loadLegalPlan } from "@/lib/legal/plan/queries";
import { loadTracking } from "@/lib/legal/tracking/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * Everything the Juridique's five step pages share, read once per request:
 * access, the project, what each step recorded and the journey for the
 * viewer. 404 without manage_legal, like every page of the section.
 */
export const legalJourneyContext = cache(async (projectId: string) => {
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!can(access, "manage_legal")) notFound();
  const viewerName =
    personName(access.firstName ?? "", access.lastName ?? "") || null;
  const [intake, inventory, confirmation, plan, tracking] = await Promise.all([
    loadIntake(project),
    loadLegalInventory(project, access),
    loadConfirmation(project, access),
    loadLegalPlan(project, access),
    loadTracking(project, access),
  ]);
  const open =
    tracking.state === "tracking"
      ? tracking.items.filter(
          (i) => i.current !== "done" && i.current !== "obsolete",
        ).length
      : 0;
  const total = tracking.state === "tracking" ? tracking.items.length : 0;
  const steps = legalJourney({
    projectId,
    owner: project.ownerPersonId
      ? {
          name: project.ownerName ?? "—",
          viewer: project.ownerPersonId === access.personId,
          viaLink: false,
        }
      : null,
    ownerRole: fr.legalJourney.owner,
    // The Juridique is done by the direction and the chefs de projet, owner
    // of the project or not (ReadOnlyNotice): the open step is the viewer's.
    actor: {
      name: viewerName ?? project.ownerName ?? "—",
      viewer: true,
      viaLink: false,
    },
    inventory: {
      known: inventory.counts.known,
      toConfirm: inventory.counts.to_confirm,
      missing: inventory.counts.missing,
    },
    questions: {
      total: intake.questions.length,
      answered: intake.questions.filter((q) => q.answered).length,
    },
    confirmation: {
      status: confirmation.status,
      reopened: confirmation.reopened,
    },
    plan: {
      launched: plan.state === "launched",
      items: plan.state === "launched" ? plan.items.length : 0,
    },
    tracking:
      tracking.state === "tracking"
        ? { total, open, done: total - open }
        : null,
  });
  return {
    access,
    project,
    intake,
    inventory,
    confirmation,
    plan,
    tracking,
    steps,
    viewerName,
  };
});
