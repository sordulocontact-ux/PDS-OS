import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The Livraison tab renders under the sheet's header and tabs (layout):
// only its content is a placeholder.
export default function ProductionDeliveryLoading() {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <SkeletonRows count={4} />
    </LoadingRegion>
  );
}
