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
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Credits: the performing artists (edited in "Modifier"), every other credit
// of the title, then the splits of the master and of the publishing
// (#splits-master), read and written with manage_catalog only (RLS agrees):
// the block is not even shown to anyone else.
export default async function MasterCreditsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/credits">) {
  const { masterId } = await params;
  const accessPromise = requireApproved();
  const [access, master, { contributors, error }, shares] = await allInOrder([
    accessPromise,
    getMaster(masterId),
    listMasterContributors(masterId),
    accessPromise.then((known) =>
      can(known, "manage_catalog") ? listMasterSplits(masterId) : null,
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
          <SplitsSection masterId={master.id} splits={shares.splits} canEdit />
        ))}
    </>
  );
}
