import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

// The Budget tab became « Business » (BIZ 10): its deals, then its budget.
// The old address leads there.
export default async function ArtistBudgetPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/budget">) {
  const { artistId } = await params;
  redirect(routes.artistBudget(artistId));
}
