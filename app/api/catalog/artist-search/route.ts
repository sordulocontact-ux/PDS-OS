import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import { artistSearchSchema } from "@/lib/catalog/schemas";
import type { DeezerArtistResult } from "@/lib/catalog/types";
import { searchArtists } from "@/lib/integrations/deezer";

/**
 * Deezer artist search for the "Nouvel artiste" modal: `?q=`. Answers the
 * results, each flagged when the catalog already holds that Deezer profile.
 * Reserved to those who may create artists; writes nothing.
 */
export async function GET(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!can(access, "manage_catalog"))
    return Response.json({ error: "forbidden" }, { status: 403 });

  const query = artistSearchSchema.safeParse(
    new URL(request.url).searchParams.get("q"),
  );
  if (!query.success)
    return Response.json({ error: "invalid_input" }, { status: 400 });

  const found = await searchArtists(query.data).catch((error: unknown) => {
    console.error("artist-search:", error);
    return null;
  });
  if (!found) return Response.json({ error: "unavailable" }, { status: 502 });

  const existing = await findArtistsByDeezerIds(found.map((a) => a.id));
  const results: DeezerArtistResult[] = found.map((artist) => ({
    deezerId: artist.id,
    name: artist.name,
    pictureUrl: artist.pictureMedium,
    fans: artist.fans,
    existing: existing.get(artist.id) ?? null,
  }));
  return Response.json({ results });
}
