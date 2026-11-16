import { PageLoading } from "@/components/shell/page-loading";
import { deals } from "@/lib/i18n/fr/deals";

export default function DealsLoading() {
  return (
    <PageLoading
      title={deals.title}
      description={deals.description}
      section
      list
    />
  );
}
