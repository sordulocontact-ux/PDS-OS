import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function NetworkLoading() {
  return (
    <PageLoading
      title={fr.network.title}
      description={fr.network.description}
    />
  );
}
