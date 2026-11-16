import { PageContainer } from "@/components/shell/page-container";
import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { auth } from "@/lib/i18n/fr/auth";
import { cn } from "@/lib/utils";

const fr = { auth };

/**
 * A section's page while it renders (docs/STYLE-FINANCE-PARTOUT.md § 5.1,
 * born as Finance's loading): the same frame as the page, its column and
 * top band, so nothing jumps when it arrives, and no title, as a section's
 * page has none. `home`: a large card and three under it; `titled`: a page
 * under the section, named; `list`: tiles over rows; `rows`: a list page,
 * its tools then its rows.
 */
export function SectionLoading({
  sidebar,
  topbar,
  shape = "list",
  className,
}: {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  shape?: "home" | "list" | "titled" | "rows";
  // The section's theme (Finance's `.finance-scope`).
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1", className)}>
      {sidebar}
      <div className="min-w-0 flex-1">
        {topbar}
        <LoadingRegion label={fr.auth.common.loading}>
          <PageContainer className="gap-6">
            {shape === "home" ? (
              <>
                <Skeleton className="h-[420px] rounded-2xl" />
                <div className="grid gap-4 lg:grid-cols-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))}
                </div>
              </>
            ) : shape === "rows" ? (
              <>
                <Skeleton className="h-10 w-full" />
                <SkeletonRows count={8} />
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
