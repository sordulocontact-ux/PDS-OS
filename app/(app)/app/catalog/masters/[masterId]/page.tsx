import { notFound } from "next/navigation";

import { MasterArtists } from "@/components/catalog/master-page/master-artists";
import { MasterActivitySection } from "@/components/catalog/master-page/master-activity-section";
import { MasterChecklist } from "@/components/catalog/master-page/master-checklist";
import { TitleStatusCard } from "@/components/catalog/master-page/title-status-card";
import { VariantsSection } from "@/components/catalog/master-page/variants-section";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  audioOverview,
  numberAudioVersions,
} from "@/lib/catalog/audio-versions";
import { listMasterActivity } from "@/lib/catalog/master/activity";
import { listAudioVersions } from "@/lib/catalog/master/audio";
import {
  countMasterItems,
  loadDistributionState,
  masterChecklist,
} from "@/lib/catalog/master/overview";
import { getMasterRights } from "@/lib/catalog/master/queries";
import { listMasterVariantIds } from "@/lib/catalog/master/related";
import { titleNextAction } from "@/lib/catalog/master/title-status";
import { formatIswc, pLine } from "@/lib/catalog/master/rules";
import { getMaster, listMasters } from "@/lib/catalog/queries";
import { variantText } from "@/lib/catalog/title-rules";
import { formatDuration, formatIsrc } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { checklistTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

// Title overview (retours Catalogue 01, 11, 12 et 14): first where the title
// stands (audio state, version of reference, project, distribution) and the
// next action, computed by code; then the dossier's completeness, folded,
// with its counter, what the release needs first and only the applicable
// declarations; facts and performing artists; its variants (#variants) and
// its activity (#activity).
export default async function MasterOverviewPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]">) {
  const { masterId } = await params;
  const [access, master, rights, counts, activity, audio] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    getMasterRights(masterId),
    countMasterItems(masterId),
    listMasterActivity(masterId),
    listAudioVersions(masterId),
  ]);
  if (!master || !rights) notFound();
  const canEdit = can(access, "manage_catalog");
  const finalValidated = master.finalValidatedAt !== null;
  const [variants, checklist, distribution] = await Promise.all([
    listMasterVariantIds(master).then(async (found) =>
      found.error
        ? { count: 0, masters: [], error: true }
        : {
            count: found.ids.length,
            ...(await listMasters({ ids: found.ids })),
          },
    ),
    masterChecklist({
      masterId,
      isrc: master.isrc,
      finalValidated,
      rights,
      counts,
      withSplits: canEdit,
    }),
    loadDistributionState(master.projects.map((p) => p.id)),
  ]);
  const versions = numberAudioVersions(audio.versions);
  const missing = checklist.filter((item) => !item.done);
  const t = fr.masterPage.overview;
  const m = fr.catalog.master;

  return (
    <>
      <TitleStatusCard
        masterId={masterId}
        audioState={master.audioState}
        finalValidated={finalValidated}
        reference={audioOverview(versions).reference}
        projects={master.projects}
        distribution={distribution}
        next={titleNextAction({
          versions,
          canReview: canEdit,
          finalValidated,
          projectCount: master.projects.length,
          missing: missing.map((item) => item.key),
        })}
        checklist={checklist}
      />

      <div className="grid gap-[var(--section-gap)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <PageSection
          card
          collapsible
          defaultOpen={false}
          id="checklist"
          title={t.checklist.title}
          description={t.checklist.description}
          action={
            <StatusBadge tone={checklistTone(missing.length === 0)} size="sm">
              {t.checklist.count(
                checklist.length - missing.length,
                checklist.length,
              )}
            </StatusBadge>
          }
        >
          <MasterChecklist items={checklist} />
        </PageSection>
        <div className="flex flex-col gap-[var(--section-gap)]">
          <PageSection card id="facts" title={t.facts}>
            <FactList
              emptyLabel={fr.catalog.notProvided}
              facts={[
                {
                  label: m.variant,
                  value: variantText(master) ?? fr.catalog.variants.original,
                },
                {
                  label: m.isrc,
                  value: master.isrc ? formatIsrc(master.isrc) : null,
                  valueClassName: "font-mono",
                },
                {
                  label: m.duration,
                  value: master.durationSeconds
                    ? formatDuration(master.durationSeconds)
                    : null,
                  valueClassName: "tabular-nums",
                },
                {
                  label: fr.masterPage.rights.fields.iswc,
                  value: rights.iswc ? formatIswc(rights.iswc) : null,
                  valueClassName: "font-mono",
                },
                { label: fr.masterPage.rights.pLine, value: pLine(rights) },
              ]}
            />
          </PageSection>
          <PageSection card id="artists" title={t.artists}>
            <MasterArtists credits={master.credits} />
          </PageSection>
        </div>
      </div>

      <VariantsSection
        masterId={masterId}
        masters={variants.masters}
        error={variants.error}
        rights={{
          canEdit,
          canArchive: can(access, "archive_records"),
          archived: false,
        }}
      />
      <MasterActivitySection
        entries={activity.entries}
        error={activity.error}
      />
    </>
  );
}
