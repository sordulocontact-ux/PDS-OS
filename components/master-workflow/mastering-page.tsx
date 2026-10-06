import { MixVersionsSection } from "@/components/master-workflow/mix-versions-section";
import { PackageSections } from "@/components/master-workflow/package-sections";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { MixVersionsView } from "@/lib/master-workflow/mix-types";
import type { StepView } from "@/lib/master-workflow/transmission";

/**
 * The Mastering step (ticket § 12): once every title has its validated Mix
 * final, the code says so ("Le Mastering peut commencer") and who masters —
 * the same engineer as the mix, or the brief's mastering engineer — then the
 * package, sent after a person confirms it, and its follow-up.
 */
export function MasteringPage({
  view,
  versions,
}: {
  view: StepView;
  versions: MixVersionsView;
}) {
  const t = fr.masterWorkflow.mastering;
  const finalsReady =
    view.titles.length > 0 && view.titles.every((title) => title.source);
  return (
    <div className="grid gap-8">
      <ProjectPageHeader title={t.title} description={t.description} />
      {finalsReady ? (
        <ToneCallout tone="success">
          <span className="block font-medium">{t.ready}</span>
          {view.engineer &&
            (view.brief?.masteringSameEngineer
              ? t.sameEngineer(view.engineer.name)
              : t.otherEngineer(view.engineer.name))}
        </ToneCallout>
      ) : (
        <ToneCallout tone="info">{t.waiting}</ToneCallout>
      )}
      <PackageSections view={view} />
      <PageSection
        id="mastering-versions"
        title={fr.masterWorkflow.mixVersions.stages.mastering.title}
        description={fr.masterWorkflow.mixVersions.stages.mastering.description}
        card
      >
        <MixVersionsSection
          projectId={view.projectId}
          view={versions}
          canEdit={view.canEdit}
          organizationId={view.organizationId}
        />
      </PageSection>
    </div>
  );
}
