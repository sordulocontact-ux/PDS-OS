import { redirect } from "next/navigation";

import { journeyContext } from "@/lib/production/journey/context";
import { stepHref } from "@/lib/production/journey/href";
import { landingStep } from "@/lib/production/journey/steps";

/** The former Préproduction tab, now split into the journey's steps: old
 * links land on the viewer's step. */
export default async function ProductionPreproductionPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/preproduction">) {
  const { projectId, deliverableId } = await params;
  const { steps } = await journeyContext(projectId, deliverableId);
  redirect(stepHref(projectId, deliverableId, landingStep(steps)));
}
