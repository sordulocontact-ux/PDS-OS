import { notFound } from "next/navigation";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isLegalStepSegment } from "@/lib/ui/legal-steps";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.shell.project.sidebar.legal} · ${fr.app.name}`,
};

// Juridique: the first step at /legal, the others one segment below
// (/legal/framing…). Empty for now: the steps above (LegalSteps, in the
// project layout) are all there is.
export default async function ProjectLegalPage({
  params,
}: PageProps<"/app/projects/[projectId]/legal/[[...step]]">) {
  const { projectId, step } = await params;
  if (step && (step.length > 1 || !isLegalStepSegment(step[0]))) notFound();
  await allInOrder([requireApproved(), requireLaunchedProject(projectId)]);

  return null;
}
