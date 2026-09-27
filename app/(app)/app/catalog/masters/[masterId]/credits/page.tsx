import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { ContributorsSection } from "@/components/catalog/master-page/contributors-section";
import { MasterArtists } from "@/components/catalog/master-page/master-artists";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listMasterContributors } from "@/lib/catalog/master/queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Contributors & credits: the performing artists (edited in "Modifier"),
// then every other credit of the title.
export default async function MasterCreditsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/credits">) {
  const { masterId } = await params;
  const [access, master, { contributors, error }] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listMasterContributors(masterId),
  ]);
  if (!master) notFound();
  const t = fr.masterPage.credits;

  return (
    <>
      <PageSection
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
    </>
  );
}
