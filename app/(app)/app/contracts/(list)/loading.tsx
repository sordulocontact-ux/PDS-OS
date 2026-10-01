import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function ContractsLoading() {
  return (
    <PageLoading
      title={fr.contracts.title}
      description={fr.contracts.description}
    />
  );
}
