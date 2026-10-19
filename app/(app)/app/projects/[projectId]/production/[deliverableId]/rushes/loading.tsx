import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The Tournage tab renders under the sheet's header and tabs (layout):
// only its content is a placeholder.
export default function ProductionShootLoading() {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <SkeletonRows count={5} />
    </LoadingRegion>
  );
}
