import { notFound } from "next/navigation";

import { ArtistBudget } from "@/components/catalog/artist-budget/artist-budget";
import { FormMessage } from "@/components/auth/form-message";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { loadArtistBudget } from "@/lib/catalog/artist-expenses-queries";
import { getArtist } from "@/lib/catalog/artist-queries";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { todayInParis } from "@/lib/insights/dates";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: artistBudget.tab };

// A signed artist's spends outside any release (retour de Sacha du
// 07/11/2026), for the Catalogue only (manage_catalog, as the RLS).
export default async function ArtistBudgetPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/budget">) {
  const { artistId } = await params;
  const [access, artist] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
  ]);
  if (!artist || artist.relation !== "signed" || !can(access, "manage_catalog"))
    notFound();
  const { expenses, projects, error } = await loadArtistBudget(artist.id);
  if (error)
    return <FormMessage kind="error">{artistBudget.loadError}</FormMessage>;
  return (
    <ArtistBudget
      artistId={artist.id}
      expenses={expenses}
      projects={projects}
      today={todayInParis()}
    />
  );
}
