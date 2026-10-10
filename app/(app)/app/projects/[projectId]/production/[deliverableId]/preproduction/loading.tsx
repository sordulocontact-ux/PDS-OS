import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { StatTilesSkeleton } from "@/components/ui/stat-tiles";
import { fr } from "@/lib/i18n/fr";

// The Préproduction tab renders under the sheet's header and tabs (layout):
// only its content is a placeholder — the summary tiles, then rows.
export default function ProductionPreproductionLoading() {
  return (
    <LoadingRegion label={fr.productionPreprod.loading} className="grid gap-10">
      <StatTilesSkeleton count={8} />
      <SkeletonRows count={6} />
    </LoadingRegion>
  );
}
