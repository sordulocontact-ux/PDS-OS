import { PageLoading } from "@/components/shell/page-loading";

// The page frame at once, as before the call's own segment moved into its
// group: the report has no record frame above it (it may be read without
// seeing the call).
export default function Loading() {
  return <PageLoading section />;
}
