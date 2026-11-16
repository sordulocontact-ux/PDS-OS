import { PageLoading } from "@/components/shell/page-loading";

// The page frame at once (a page under the Réseau: its name stays, so the
// frame is the section's, without a title yet). One loading.tsx per segment,
// none above a record's frame, so a missing record answers 404
// (docs/ARCHITECTURE.md § 3 bis).
export default function Loading() {
  return <PageLoading section />;
}
