import { PageLoading } from "@/components/shell/page-loading";
import { deals } from "@/lib/i18n/fr/deals";

export default function DealLoading() {
  return <PageLoading title={deals.title} section />;
}
