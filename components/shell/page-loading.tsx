import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { SectionTopbar } from "@/components/shell/section-topbar";
import { TopbarCrumb } from "@/components/shell/topbar-crumb";
import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { auth } from "@/lib/i18n/fr/auth";
import { cn } from "@/lib/utils";

const fr = { auth };

// Placeholder of an application page while it renders (loading.tsx): the
// page frame at once, with its real title when it is known in advance, and
// rows standing for the content unless the page gives its own shape.
// `section`: a page drawn in SectionFrame, the same frame (its top band in
// the new style) so nothing jumps; `list`: a section's own page, untitled
// in the new style (PageHeader).
export function PageLoading({
  title,
  description,
  section = false,
  list = false,
  children,
}: {
  title?: string;
  description?: string;
  section?: boolean;
  list?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      {section && (
        <SectionTopbar>{title && <TopbarCrumb title={title} />}</SectionTopbar>
      )}
      <LoadingRegion label={fr.auth.common.loading}>
        <PageContainer className={cn(section && "modern:gap-6")}>
          {title ? (
            <PageHeader title={title} description={description} list={list} />
          ) : (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-56 max-w-full" />
              <Skeleton className="h-6 w-80 max-w-full" />
            </div>
          )}
          {children ?? <SkeletonRows />}
        </PageContainer>
      </LoadingRegion>
    </>
  );
}
