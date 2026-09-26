import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { fr } from "@/lib/i18n/fr";

export default function ArtistsLoading() {
  return (
    <PageContainer>
      <PageHeader
        title={fr.catalog.artists.title}
        description={fr.catalog.artists.subtitle}
      />
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <p className="sr-only">{fr.auth.common.loading}</p>
    </PageContainer>
  );
}
