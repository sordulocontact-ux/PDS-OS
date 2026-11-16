import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function Loading() {
  return (
    <PageLoading
      title={fr.laboCaptures.title}
      description={fr.laboCaptures.description}
      section
      list
    />
  );
}
