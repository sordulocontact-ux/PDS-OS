import { FormMessage } from "@/components/auth/form-message";
import { DistributionList } from "@/components/catalog/master-page/distribution-list";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import type { MasterDistributionRelease } from "@/lib/catalog/master/related";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { masterPage };

// Distribution block: the releases of the projects carrying the title (UPC,
// date, status, detected links). Read-only: edited in each project's Sortie.
export function DistributionSection({
  releases,
  error,
  hasProjects,
}: {
  releases: MasterDistributionRelease[];
  error: boolean;
  hasProjects: boolean;
}) {
  const t = fr.masterPage.distribution;
  return (
    <PageSection
      card
      id="distribution"
      title={t.title}
      description={t.description}
    >
      {error ? (
        <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
      ) : releases.length === 0 ? (
        <EmptyNote>{hasProjects ? t.emptyBodyLinked : t.emptyBody}</EmptyNote>
      ) : (
        <DistributionList releases={releases} />
      )}
    </PageSection>
  );
}
