import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { ContributorsSection } from "@/components/catalog/master-page/contributors-section";
import { MasterArtists } from "@/components/catalog/master-page/master-artists";
import { SplitsSection } from "@/components/catalog/master-page/splits-section";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  listMasterContributors,
  listMasterSplits,
} from "@/lib/catalog/master/queries";
import { loadSplitReview } from "@/lib/catalog/master/split-queries";
import { publishingGaps } from "@/lib/catalog/master/split-review";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { confirmedSplitOf } from "@/lib/legal/splits/title-split";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.masterPage.tabs.credits };

// Credits: the performing artists (edited in "Modifier"), every other credit
// of the title, then the splits of the master and of the publishing
// (#splits-master), read and written with manage_catalog only (RLS agrees):
// the block is not even shown to anyone else. Each split says its
// validation (the legal side validates), its history and, for the
// publishing, the credited authors without a share (retours 44 à 53).
export default async function MasterCreditsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/credits">) {
  const { masterId } = await params;
  const accessPromise = requireApproved();
  const [access, master, { contributors, error }, shares, confirmed, review] =
    await allInOrder([
      accessPromise,
      getMaster(masterId),
      listMasterContributors(masterId),
      accessPromise.then((known) =>
        can(known, "manage_catalog") ? listMasterSplits(masterId) : null,
      ),
      // Read only with manage_legal (RLS): null for anyone else.
      accessPromise.then((known) =>
        can(known, "manage_legal") ? confirmedSplitOf(masterId) : null,
      ),
      accessPromise.then((known) =>
        can(known, "manage_catalog") ? loadSplitReview(masterId) : null,
      ),
    ]);
  if (!master) notFound();
  const t = fr.masterPage.credits;

  return (
    <>
      <PageSection
        card
        id="artists"
        title={t.artistsTitle}
        description={t.artistsDescription}
      >
        <MasterArtists credits={master.credits} />
      </PageSection>
      {error ? (
        <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
      ) : (
        <ContributorsSection
          masterId={master.id}
          contributors={contributors}
          canEdit={can(access, "manage_catalog")}
        />
      )}
      {shares &&
        (shares.error ? (
          <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
        ) : (
          <SplitsSection
            masterId={master.id}
            splits={shares.splits}
            canEdit
            confirmed={confirmed}
            validations={review?.validations}
            events={review?.events}
            gaps={publishingGaps(contributors, shares.splits)}
            canValidate={can(access, "manage_legal")}
          />
        ))}
    </>
  );
}
