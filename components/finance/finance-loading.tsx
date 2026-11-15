import { FinanceSidebar } from "@/components/finance/finance-sidebar";
import { FinanceTopbar } from "@/components/finance/search/finance-topbar";
import { PageContainer } from "@/components/shell/page-container";
import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

/**
 * A Finance page while it renders (every loading.tsx of the section): the
 * same frame as the page, its sidebar, top band and `.finance-scope`, so nothing jumps
 * when it arrives, and no title, as a section's page has none (lot 2,
 * docs/FINANCE-V2.md). `home`: the overview's greeting and cards; `titled`:
 * an envelope's name; else a row of tiles over rows.
 */
export function FinanceLoading({
  shape = "list",
}: {
  shape?: "home" | "list" | "titled";
}) {
  return (
    <div className="finance-scope flex flex-1">
      <FinanceSidebar />
      <div className="min-w-0 flex-1">
        <FinanceTopbar />
        <LoadingRegion label={fr.auth.common.loading}>
          <PageContainer className="gap-6">
            {shape === "home" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-64 max-w-full" />
                  <Skeleton className="h-5 w-80 max-w-full" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-56 rounded-2xl" />
                  ))}
                </div>
              </>
            ) : (
              <>
                {shape === "titled" && (
                  <Skeleton className="h-8 w-56 max-w-full" />
                )}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                  ))}
                </div>
                <SkeletonRows count={6} />
              </>
            )}
          </PageContainer>
        </LoadingRegion>
      </div>
    </div>
  );
}
