import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChecksSection } from "@/components/distribution/checks-section";
import { DossierParamsCard } from "@/components/distribution/dossier-params-card";
import { DossierSections } from "@/components/distribution/dossier-sections";
import { ValidationSection } from "@/components/distribution/validation-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { loadDistributionView } from "@/lib/distribution/view";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isUuid } from "@/lib/release/uuid";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.distribution.dossier;

export const metadata: Metadata = { title: `${t.title} · ${fr.app.name}` };

// Distribution, Dossier (ticket « Distribution » § 6.4-6.7): where the
// validation stands, the six checks, the distribution's own parameters,
// then the delivery file built from the sources' references. Nothing is
// sent: the deposit is made by hand at The Orchard.
export default async function DistributionDossierPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/dossier">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const view = await loadDistributionView(project, access);
  const { sources } = view;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </header>
      <ToneCallout tone="info">{fr.distribution.manualNotice}</ToneCallout>
      {sources.failed && (
        <ToneCallout tone="danger">
          {fr.distribution.readiness.failed}
        </ToneCallout>
      )}
      <ValidationSection projectId={projectId} view={view} />
      <ChecksSection
        projectId={projectId}
        checks={view.checks}
        canCheck={view.canCheck}
      />
      <DossierParamsCard
        projectId={projectId}
        params={sources.params}
        sheets={sources.sheets}
        coverGuessed={sources.coverGuessed}
        // Frozen while a version waits or stands validated.
        canEdit={view.canEdit && !view.open}
      />
      <DossierSections sections={view.sections} />
    </div>
  );
}
