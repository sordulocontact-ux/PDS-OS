import { notFound } from "next/navigation";

import { MasterArtists } from "@/components/catalog/master-page/master-artists";
import { MasterActivitySection } from "@/components/catalog/master-page/master-activity-section";
import { MasterChecklist } from "@/components/catalog/master-page/master-checklist";
import { VariantsSection } from "@/components/catalog/master-page/variants-section";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatTiles } from "@/components/ui/stat-tiles";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listMasterActivity } from "@/lib/catalog/master/activity";
import {
  countMasterItems,
  masterChecklist,
} from "@/lib/catalog/master/overview";
import { getMasterRights } from "@/lib/catalog/master/queries";
import { listMasterVariantIds } from "@/lib/catalog/master/related";
import { formatIswc, pLine } from "@/lib/catalog/master/rules";
import { getMaster, listMasters } from "@/lib/catalog/queries";
import { variantText } from "@/lib/catalog/title-rules";
import { formatDuration, formatIsrc } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Title overview: key figures (each opens its tab or block), what the title's
// file still needs, facts and performing artists, then its variants
// (#variants) and its activity (#activity).
export default async function MasterOverviewPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]">) {
  const { masterId } = await params;
  const [access, master, rights, counts, activity] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    getMasterRights(masterId),
    countMasterItems(masterId),
    listMasterActivity(masterId),
  ]);
  if (!master || !rights) notFound();
  const [variants, checklist] = await Promise.all([
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
      rights,
      counts,
      withSplits: can(access, "manage_catalog"),
    }),
  ]);
  const t = fr.masterPage.overview;
  const m = fr.catalog.master;

  return (
    <>
      <StatTiles
        columns={5}
        stats={[
          {
            label: t.figures.audioFiles,
            value: String(counts.audioFiles),
            href: routes.masterAudio(masterId),
          },
          {
            label: t.figures.variants,
            value: String(variants.count + 1),
            href: routes.masterVariants(masterId),
          },
          {
            label: t.figures.sessions,
            value: String(counts.sessions),
            href: routes.masterSessions(masterId),
          },
          {
            label: t.figures.contributors,
            value: String(counts.contributors),
            href: routes.masterCredits(masterId),
          },
          {
            label: t.figures.projects,
            value: String(master.projects.length),
            href: routes.masterProjects(masterId),
          },
        ]}
      />

      <div className="grid gap-[var(--section-gap)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <PageSection card id="checklist" title={t.checklist.title}>
          <MasterChecklist items={checklist} />
        </PageSection>
        <div className="flex flex-col gap-[var(--section-gap)]">
          <PageSection card id="facts" title={t.facts}>
            <FactList
              emptyLabel={fr.catalog.notProvided}
              facts={[
                {
                  label: m.audioState,
                  value: master.audioState
                    ? fr.catalog.audioStates[master.audioState]
                    : null,
                },
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
          canEdit: can(access, "manage_catalog"),
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
