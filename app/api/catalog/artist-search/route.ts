import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { parseDeezerLink } from "@/lib/catalog/deezer-link";
import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import { artistSearchSchema } from "@/lib/catalog/schemas";
import type { DeezerArtistResult } from "@/lib/catalog/types";
import {
  getDeezerArtist,
  resolveDeezerShareLink,
  searchArtists,
  type DeezerArtist,
} from "@/lib/integrations/deezer";

// A pasted Deezer link answers that one artist, however few fans it has; a
// link to anything but an artist answers no result.
async function findArtists(query: string): Promise<DeezerArtist[]> {
  const link = parseDeezerLink(query);
  if (!link) return searchArtists(query);
  const id =
    link.kind === "artist"
      ? link.id
      : link.kind === "share"
        ? await resolveDeezerShareLink(link.url)
        : null;
  const artist = id ? await getDeezerArtist(id) : null;
  return artist ? [artist] : [];
}

/**
 * Deezer artist search for the "Nouvel artiste" modal: `?q=` is a name or a
 * Deezer artist link. Answers the results, each flagged when the catalog
 * already holds that Deezer profile.
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

  const found = await findArtists(query.data).catch((error: unknown) => {
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
