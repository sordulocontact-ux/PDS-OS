import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

export default function SettingsLoading() {
  return (
    <PageLoading
      title={fr.aiUsage.settings.title}
      description={fr.aiUsage.settings.description}
    />
  );
}
