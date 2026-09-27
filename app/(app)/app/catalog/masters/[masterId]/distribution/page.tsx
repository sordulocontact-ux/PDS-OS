import { IconGlobePointer } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { DistributionList } from "@/components/catalog/master-page/distribution-list";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { listMasterDistribution } from "@/lib/catalog/master/related";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Distribution: the releases of the projects carrying the master (UPC, date,
// status, detected links). Read-only: edited in each project's Sortie.
export default async function MasterDistributionPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/distribution">) {
  const { masterId } = await params;
  const [, master, { releases, error }] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listMasterDistribution(masterId),
  ]);
  if (!master) notFound();
  const t = fr.masterPage.distribution;

  if (error)
    return <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>;
  if (releases.length === 0) {
    return (
      <EmptyState
        icon={IconGlobePointer}
        title={t.emptyTitle}
        body={master.projects.length > 0 ? t.emptyBodyLinked : t.emptyBody}
      />
    );
  }
  return (
    <PageSection
      id="distribution"
      title={fr.masterPage.tabs.distribution}
      description={t.description}
    >
      <DistributionList releases={releases} />
    </PageSection>
  );
}
