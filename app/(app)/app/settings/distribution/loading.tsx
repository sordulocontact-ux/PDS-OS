import { PageLoading } from "@/components/shell/page-loading";
import { settings } from "@/lib/i18n/fr/settings";

export default function Loading() {
  return <PageLoading title={settings.pages.distribution} section />;
}
