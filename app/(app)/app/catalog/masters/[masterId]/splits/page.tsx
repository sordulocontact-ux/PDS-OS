import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

// Former tab, now a block of another page: links already shared still land
// on it (docs/DESIGN.md § 4, « Onglets »).
export default async function Page({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/splits">) {
  const { masterId } = await params;
  redirect(routes.masterSplits(masterId));
}
