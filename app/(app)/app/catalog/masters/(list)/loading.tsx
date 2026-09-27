import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function MastersLoading() {
  return (
    <PageLoading
      title={fr.catalog.masters.title}
      description={fr.catalog.masters.subtitle}
    />
  );
}
