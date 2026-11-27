import { PageLoading } from "@/components/shell/page-loading";
import { shortcuts } from "@/lib/i18n/fr/shortcuts";

export default function ShortcutsLoading() {
  return <PageLoading title={shortcuts.title} section />;
}
