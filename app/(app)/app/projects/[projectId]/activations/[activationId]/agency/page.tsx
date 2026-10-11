import { notFound } from "next/navigation";

import { AgencyGallery } from "@/components/activations/agency/agency-gallery";
import { PreviewPanel } from "@/components/activations/agency/preview-panel";
import { RecapButton } from "@/components/activations/agency/recap-button";
import { SourcesSection } from "@/components/activations/agency/sources-section";
import { MessagesSection } from "@/components/activations/messages/messages-section";
import { PageSection } from "@/components/shell/page-section";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { loadAgency } from "@/lib/activations/agency/queries";
import { loadActivationFiche } from "@/lib/activations/fiche";
import { loadMessages } from "@/lib/activations/messages/queries";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { viewHref } from "@/lib/ui/view-href";

export const metadata = {
  title: `${fr.activations.tabs.agency} · ${fr.app.name}`,
};

const DECISIONS = [
  "to_review",
  "validated",
  "refused",
  "to_discuss",
  "waiting_info",
  "to_fix",
] as const;

/**
 * Agency mode (tickets Influence parcours B, RP § 6) : the agency's sources
 * read only, the read waiting for confirmation, the rows with the agency's
 * status and the PDS decision side by side, the recap message.
 */
export default async function ActivationAgencyPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]/agency">) {
  const { projectId, activationId } = await params;
  const query = await searchParams;
  const access = await requireApproved();
  const {
    activation: a,
    members,
    canWrite,
  } = await loadActivationFiche(projectId, activationId, access);
  if (a.mode !== "agency") notFound();
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
  const decision = DECISIONS.find((d) => d === query.decision) ?? null;
  const rows = decision
    ? agency.rows.filter((r) => r.pdsDecision === decision)
    : agency.rows;
  const path = routes.projectActivationTab(projectId, a.id, "agency");
  const t = fr.activationAgency;
  const previewSource =
    agency.preview &&
    agency.sources.find((s) => s.id === agency.preview?.sourceId);

  return (
    <div className="grid gap-8">
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
          {agency.rows.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t.gallery.filter}
            >
              <FilterChipLink href={path} current={decision === null}>
                {t.gallery.all} · {agency.rows.length}
              </FilterChipLink>
              {DECISIONS.filter((d) =>
                agency.rows.some((r) => r.pdsDecision === d),
              ).map((d) => (
                <FilterChipLink
                  key={d}
                  href={viewHref(path, { decision: d })}
                  current={decision === d}
                >
                  {t.gallery.decisions[d]} ·{" "}
                  {agency.rows.filter((r) => r.pdsDecision === d).length}
                </FilterChipLink>
              ))}
            </div>
          )}
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
