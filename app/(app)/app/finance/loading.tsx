import { PageLoading } from "@/components/shell/page-loading";
import { finance } from "@/lib/i18n/fr/finance";

export default function FinanceLoading() {
  return <PageLoading title={finance.title} />;
}
