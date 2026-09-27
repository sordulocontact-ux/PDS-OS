import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function ArtistsLoading() {
  return (
    <PageLoading
      title={fr.catalog.artists.title}
      description={fr.catalog.artists.subtitle}
    />
  );
}
