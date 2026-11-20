import { notFound } from "next/navigation";

import { getNetworkList } from "@/lib/network/lists";

// A list that does not exist, or is another's private list, answers a real
// 404: read before this segment's loading.tsx (docs/ARCHITECTURE.md § 3
// bis); the pages reuse it.
export default async function NetworkListLayout({
  children,
  params,
}: LayoutProps<"/app/network/lists/[listId]">) {
  const { listId } = await params;
  if (!(await getNetworkList(listId))) notFound();
  return children;
}
