import { PageLoading } from "@/components/shell/page-loading";
import { fr } from "@/lib/i18n/fr";

// The page frame at once. One loading.tsx per segment, none above a
// record's frame, so a missing record answers 404 (docs/ARCHITECTURE.md
// § 3 bis).
export default function Loading() {
  return <PageLoading title={fr.work.title} section list />;
}
