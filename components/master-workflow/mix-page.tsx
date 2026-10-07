import { MixVersionsSection } from "@/components/master-workflow/mix-versions-section";
import { PackageSections } from "@/components/master-workflow/package-sections";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { PageSection } from "@/components/shell/page-section";
import { fr } from "@/lib/i18n/fr";
import type { MixVersionsView } from "@/lib/master-workflow/mix-types";
import type { StepView } from "@/lib/master-workflow/transmission";

/**
 * The Mix step: the package for the mix engineer and its follow-up, then
 * the versions received, their feedback and the validator's decision.
 */
export function MixPage({
  view,
  versions,
}: {
  view: StepView;
  versions: MixVersionsView;
}) {
  const t = fr.masterWorkflow.mix;
  return (
    <div className="grid gap-8">
      <ProjectPageHeader title={t.title} description={t.description} />
      <PackageSections view={view} />
      <PageSection
        id="mix-versions"
        title={fr.masterWorkflow.mixVersions.stages.mix.title}
        description={fr.masterWorkflow.mixVersions.stages.mix.description}
        card
      >
        <MixVersionsSection
          projectId={view.projectId}
          view={versions}
          canEdit={view.canEdit}
          organizationId={view.organizationId}
          hasBrief={view.brief !== null}
        />
      </PageSection>
    </div>
  );
}
