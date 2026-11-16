import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

// Placeholder of an application page while it renders (loading.tsx): the
// page frame at once, with its real title when it is known in advance, and
// rows standing for the content unless the page gives its own shape.
// `list`: a section's list page, untitled in the new style (PageHeader).
export function PageLoading({
  title,
  description,
  list = false,
  children,
}: {
  title?: string;
  description?: string;
  list?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <PageContainer>
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
  );
}
