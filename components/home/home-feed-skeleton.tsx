import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

/** The home's feed while it is read: « Maintenant », then a list — the
 * shape of what arrives. Shared by the page's Suspense and loading.tsx. */
export function HomeFeedSkeleton() {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <div className="flex flex-col gap-10">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </LoadingRegion>
  );
}
