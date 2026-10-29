import { notFound } from "next/navigation";

import { MasterActivitySection } from "@/components/catalog/master-page/master-activity-section";
import { TitleDossier } from "@/components/catalog/master-page/title-dossier";
import { TitleInfo } from "@/components/catalog/master-page/title-info";
import { TitleNow } from "@/components/catalog/master-page/title-now";
import { VariantsSection } from "@/components/catalog/master-page/variants-section";
import { versionLabel } from "@/components/catalog/master-page/audio/audio-version-list";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  audioOverview,
  numberAudioVersions,
} from "@/lib/catalog/audio-versions";
import { listMasterActivity } from "@/lib/catalog/master/activity";
import { listAudioVersions } from "@/lib/catalog/master/audio";
import { loadTitleDossier, missingOf } from "@/lib/catalog/master/dossier";
import { loadDistributionState } from "@/lib/catalog/master/overview";
import { getMasterRights } from "@/lib/catalog/master/queries";
import { listMasterVariantIds } from "@/lib/catalog/master/related";
import { titleNextAction } from "@/lib/catalog/master/title-status";
import { getMaster, listMasters } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Title overview (retours Catalogue 01, 11, 12 et 14; proto
// `docs/protos/titre.html`, Sacha 29/10/2026): where the title stands in a
// line of facts, « Maintenant » (the next action computed by code), the
// dossier — each piece with its value, or filled on the spot, what the
// release needs first —, the other facts and artists, its variants
// (#variants) and its activity (#activity).
export default async function MasterOverviewPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]">) {
  const { masterId } = await params;
  const [access, master, rights, activity, audio] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    getMasterRights(masterId),
    listMasterActivity(masterId),
    listAudioVersions(masterId),
  ]);
  if (!master || !rights) notFound();
  const canEdit = can(access, "manage_catalog");
  const finalValidated = master.finalValidatedAt !== null;
  const [variants, rows, distribution] = await Promise.all([
    listMasterVariantIds(master).then(async (found) =>
      found.error
        ? { count: 0, masters: [], error: true }
        : {
            count: found.ids.length,
            ...(await listMasters({ ids: found.ids })),
          },
    ),
    loadTitleDossier({
      masterId,
      isrc: master.isrc,
      finalValidated,
      rights,
      withSplits: canEdit,
    }),
    loadDistributionState(master.projects.map((p) => p.id)),
  ]);
  const versions = numberAudioVersions(audio.versions);
  const reference = audioOverview(versions).reference;
  const t = fr.masterPage.overview;

  return (
    <>
      <TitleNow
        masterId={masterId}
        title={master.title}
        next={titleNextAction({
          versions,
          canReview: canEdit,
          finalValidated,
          projectCount: master.projects.length,
          missing: missingOf(rows),
        })}
        rows={rows}
        rights={rights}
        canEdit={canEdit}
      />

      <div className="grid items-start gap-[var(--section-gap)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <TitleDossier
          masterId={masterId}
          rows={rows}
          rights={rights}
          canEdit={canEdit}
        />
        <TitleInfo
          master={master}
          status={[
            {
              label: t.status.audio,
              value: master.audioState
                ? fr.catalog.audioStates[master.audioState]
                : t.status.noAudio,
            },
            {
              label: t.status.reference,
              value: reference ? versionLabel(reference) : t.status.noReference,
            },
            {
              label: t.status.projects,
              value:
                master.projects.map((p) => p.title).join(", ") ||
                t.status.noProject,
            },
            {
              label: t.status.distribution,
              value: t.distributionStates[distribution],
            },
          ]}
        />
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
