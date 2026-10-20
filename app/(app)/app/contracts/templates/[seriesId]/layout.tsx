import { notFound } from "next/navigation";

import { findTemplateSeries } from "@/lib/contracts/template-series";

// A template that does not exist (or reserved to manage_legal) answers a
// real 404: read before this segment's loading.tsx (docs/ARCHITECTURE.md
// § 3 bis); the page reuses it.
export default async function ContractTemplateLayout({
  children,
  params,
}: LayoutProps<"/app/contracts/templates/[seriesId]">) {
  const { seriesId } = await params;
  if (!(await findTemplateSeries(seriesId))) notFound();
  return children;
}
