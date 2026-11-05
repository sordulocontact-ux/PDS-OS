import { IconBox2 } from "nucleo-sharp-essential";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { productionEntry } from "@/lib/journey/landing";
import { loadProjectJourneys } from "@/lib/journey/project";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionJourney.empty;

/**
 * Marketing › Production (proto « Projet complet »): no list of its own —
 * it opens on the deliverable where the viewer has something to do, else
 * the first one in Production; the bar of each deliverable's page switches
 * between them. The Production starts with the transfer of a Fiche from
 * the Conception: nothing to start nor to validate here (decision of the
 * 19/10/2026, docs/ARCHITECTURE.md § 8 nonies).
 */
export default async function ProjectProductionPage({
  params,
}: PageProps<"/app/projects/[projectId]/production">) {
  const { projectId } = await params;
  await allInOrder([requireApproved(), requireLaunchedProject(projectId)]);
  // Straight to the deliverable's step (lib/journey/landing.ts).
  const { journeys } = await loadProjectJourneys(projectId);
  const entry = productionEntry(projectId, journeys);
  if (entry) redirect(entry);
  return (
    <EmptyState
      icon={IconBox2}
      title={t.title}
      body={t.body}
      action={
        <ViewLink
          href={routes.projectDesign(projectId)}
          className={buttonVariants({ variant: "outline" })}
        >
          <ButtonRoll>{t.action}</ButtonRoll>
        </ViewLink>
      }
    />
  );
}
