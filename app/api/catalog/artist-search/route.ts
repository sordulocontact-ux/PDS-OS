import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { lookUpDeezerArtists } from "@/lib/catalog/deezer-artist-lookup";
import { artistSearchSchema } from "@/lib/catalog/schemas";

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

  const results = await lookUpDeezerArtists(query.data).catch(
    (error: unknown) => {
      console.error("artist-search:", error);
      return null;
    },
  );
  if (!results) return Response.json({ error: "unavailable" }, { status: 502 });
  return Response.json({ results });
}
