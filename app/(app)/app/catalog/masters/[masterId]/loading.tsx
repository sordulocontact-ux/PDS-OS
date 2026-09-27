import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// A tab of the master page: the header and tabs stay (layout), only the tab
// body is replaced while it loads.
export default function MasterTabLoading() {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <SkeletonRows count={4} />
    </LoadingRegion>
  );
}
