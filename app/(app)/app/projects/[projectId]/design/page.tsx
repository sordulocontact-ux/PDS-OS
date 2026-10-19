import { notFound, redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { designJourneyContext } from "@/lib/design/journey-context";
import { designLanding } from "@/lib/design/journey";

/**
 * The Conception's entry: the step that waits for the person looking (their
 * own, else the first open one). Links kept in notifications and e-mails
 * (`/design`, `/design#deliverable-…`) land here.
 */
export default async function DesignPage({
  params,
}: PageProps<"/app/projects/[projectId]/design">) {
  const { projectId } = await params;
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  redirect(routes.projectDesignStep(projectId, designLanding(ctx.steps)));
}
