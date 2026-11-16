import { PageLoading } from "@/components/shell/page-loading";
import { expenses } from "@/lib/i18n/fr/expenses";

export default function ExpensesLoading() {
  return (
    <PageLoading
      title={expenses.title}
      description={expenses.description}
      section
      list
    />
  );
}
