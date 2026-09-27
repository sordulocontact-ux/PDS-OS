import { notFound } from "next/navigation";

import { MasterArtists } from "@/components/catalog/master-page/master-artists";
import { MasterChecklist } from "@/components/catalog/master-page/master-checklist";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatTiles } from "@/components/ui/stat-tiles";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  countMasterItems,
  masterChecklist,
} from "@/lib/catalog/master/overview";
import { getMasterRights } from "@/lib/catalog/master/queries";
import { listMasterVersionIds } from "@/lib/catalog/master/related";
import { formatIswc, pLine } from "@/lib/catalog/master/rules";
import { getMaster } from "@/lib/catalog/queries";
import { formatDuration, formatIsrc } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Master overview: key figures (each opens its tab), what the master's file
// still needs, facts and performing artists.
export default async function MasterOverviewPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]">) {
  const { masterId } = await params;
  const [access, master, rights, counts] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    getMasterRights(masterId),
    countMasterItems(masterId),
  ]);
  if (!master || !rights) notFound();
  const [versions, checklist] = await Promise.all([
    listMasterVersionIds(master),
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
        stats={[
          {
            label: t.figures.versions,
            value: String(versions.ids.length + 1),
            href: routes.masterVersions(masterId),
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
        <PageSection id="checklist" title={t.checklist.title}>
          <MasterChecklist items={checklist} />
        </PageSection>
        <div className="flex flex-col gap-[var(--section-gap)]">
          <PageSection id="facts" title={t.facts}>
            <FactList
              emptyLabel={fr.catalog.notProvided}
              facts={[
                { label: m.version, value: master.version ?? m.mainVersion },
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
          <PageSection id="artists" title={t.artists}>
            <MasterArtists credits={master.credits} />
          </PageSection>
        </div>
      </div>
    </>
  );
}
