import { notFound } from "next/navigation";

import { findContract } from "@/lib/contracts/queries";

// A contract that does not exist answers a real 404: read before this
// segment's loading.tsx (docs/ARCHITECTURE.md § 3 bis); the page reuses it.
export default async function ContractLayout({
  children,
  params,
}: LayoutProps<"/app/contracts/[contractId]">) {
  const { contractId } = await params;
  if (!(await findContract(contractId))) notFound();
  return children;
}
