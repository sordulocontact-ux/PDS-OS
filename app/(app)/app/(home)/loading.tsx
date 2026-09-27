import { HomeFrame } from "@/components/home/home-frame";
import { CardGridSkeleton } from "@/components/ui/card-grid";
import { fr } from "@/lib/i18n/fr";

// Home before the viewer is known: the same frame, PO already usable.
export default function HomeLoading() {
  return (
    <HomeFrame title={null}>
      <CardGridSkeleton label={fr.auth.common.loading} />
    </HomeFrame>
  );
}
