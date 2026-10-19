import { AgencyGallery } from "@/components/activations/agency/agency-gallery";
import { PreviewPanel } from "@/components/activations/agency/preview-panel";
import { RecapButton } from "@/components/activations/agency/recap-button";
import { SourcesSection } from "@/components/activations/agency/sources-section";
import { MessagesSection } from "@/components/activations/messages/messages-section";
import { PageSection } from "@/components/shell/page-section";
import { loadAgency } from "@/lib/activations/agency/queries";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadMessages } from "@/lib/activations/messages/queries";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";

/**
 * Agency mode in the activation's page (tickets Influence parcours B, RP
 * § 6): the agency's sources read only, the read waiting for confirmation,
 * the rows with the agency's status and the PDS decision side by side, the
 * recap message.
 */
export async function AgencyFile({
  fiche,
  access,
}: {
  fiche: ActivationFiche;
  access: Access;
}) {
  const { activation: a, members, canWrite, project } = fiche;
  const projectId = project.id;
  const [agency, messages] = await Promise.all([
    loadAgency(a.id),
    loadMessages(a.id),
  ]);
  const press = a.kind === "press";
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId,
    activationId: a.id,
  };
  const rows = agency.rows;
  const t = fr.activationAgency;
  const previewSource =
    agency.preview &&
    agency.sources.find((s) => s.id === agency.preview?.sourceId);

  return (
    <div id="agency" className="grid scroll-mt-5 gap-8">
      <SourcesSection
        scope={scope}
        sources={agency.sources}
        press={press}
        canWrite={canWrite}
      />
      {agency.preview && (
        <PreviewPanel
          key={agency.preview.id}
          projectId={projectId}
          snapshotId={agency.preview.id}
          sourceLabel={previewSource?.label ?? ""}
          rows={agency.preview.rows}
          fileErrors={agency.preview.errors}
          canWrite={canWrite}
        />
      )}
      <PageSection
        id="rows"
        title={press ? t.gallery.titlePress : t.gallery.title}
        description={t.gallery.description}
      >
        <div className="flex flex-col gap-4">
          {agency.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.gallery.empty}</p>
          ) : (
            <AgencyGallery
              projectId={projectId}
              rows={rows}
              sources={agency.sources}
              press={press}
              canWrite={canWrite}
            />
          )}
        </div>
      </PageSection>
      <MessagesSection
        projectId={projectId}
        activationId={a.id}
        targetId={null}
        messages={messages.filter((m) => m.kind === "agency_recap")}
        kinds={["agency_recap"]}
        defaults={{
          kind: "agency_recap",
          subject: t.recap.subject(a.title),
          body: t.recap.intro,
        }}
        members={members}
        canWrite={canWrite}
        today={todayInParis()}
        title={t.recap.title}
        addAction={
          agency.rows.length > 0 && (
            <RecapButton projectId={projectId} activationId={a.id} />
          )
        }
      />
    </div>
  );
}
