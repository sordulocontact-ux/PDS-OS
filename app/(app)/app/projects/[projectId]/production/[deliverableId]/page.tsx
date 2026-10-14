import { redirect } from "next/navigation";

import { journeyContext } from "@/lib/production/journey/context";
import { stepHref } from "@/lib/production/journey/href";
import { landingStep } from "@/lib/production/journey/steps";

/** A deliverable's production opens on the viewer's own step, else the
 * first open one (lib/production/journey). */
export default async function ProductionSheetPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]">) {
  const { projectId, deliverableId } = await params;
  const { steps } = await journeyContext(projectId, deliverableId);
  redirect(stepHref(projectId, deliverableId, landingStep(steps)));
}
