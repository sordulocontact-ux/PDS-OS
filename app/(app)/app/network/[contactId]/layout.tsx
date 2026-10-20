import { notFound } from "next/navigation";

import { getNetworkContact } from "@/lib/network/queries";

// A contact that does not exist answers a real 404: read before this
// segment's loading.tsx (docs/ARCHITECTURE.md § 3 bis); the page reuses it.
export default async function NetworkContactLayout({
  children,
  params,
}: LayoutProps<"/app/network/[contactId]">) {
  const { contactId } = await params;
  if (!(await getNetworkContact(contactId))) notFound();
  return children;
}
