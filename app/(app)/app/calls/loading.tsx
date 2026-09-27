import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function CallsLoading() {
  return (
    <PageLoading
      title={fr.calls.all.title}
      description={fr.calls.all.description}
    />
  );
}
