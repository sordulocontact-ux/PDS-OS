import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function NetworkListsLoading() {
  return <PageLoading title={fr.network.lists.title} section />;
}
