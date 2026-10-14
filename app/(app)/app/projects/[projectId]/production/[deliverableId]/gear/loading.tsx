import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// A step of the journey renders next to the steps (layout): only its
// content is a placeholder.
export default function ProductionStepLoading() {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <SkeletonRows count={5} />
    </LoadingRegion>
  );
}
