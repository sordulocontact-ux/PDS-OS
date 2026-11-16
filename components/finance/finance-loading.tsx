import { FinanceSidebar } from "@/components/finance/finance-sidebar";
import { FinanceTopbar } from "@/components/finance/search/finance-topbar";
import { SectionLoading } from "@/components/shell/section-loading";

/** A Finance page while it renders (every loading.tsx of the section):
 * SectionLoading in Finance's frame and theme. */
export function FinanceLoading({
  shape = "list",
}: {
  shape?: "home" | "list" | "titled";
}) {
  return (
    <SectionLoading
      className="finance-scope"
      sidebar={<FinanceSidebar />}
      topbar={<FinanceTopbar />}
      shape={shape}
    />
  );
}
