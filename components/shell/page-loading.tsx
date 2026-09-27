import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// Placeholder of an application page while it renders (loading.tsx): the
// page frame at once, with its real title when it is known in advance, and
// rows standing for the content unless the page gives its own shape.
export function PageLoading({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <PageContainer>
        {title ? (
          <PageHeader title={title} description={description} />
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
