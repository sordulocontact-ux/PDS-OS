import { ContactLinkOffer } from "@/components/portal/contact-links-section";
import { createClient } from "@/lib/supabase/server";

/**
 * The artist's page by project, next to the versions (proto `master:v1`,
 * rôle « mona »): they listen there to each version in listening and leave
 * their feedback; the link is the person's one (lot 11), created, copied
 * and sent from here like any other.
 */
export async function ListenLinkOffer({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const [project, titles] = await Promise.all([
    supabase
      .from("projects")
      .select("artist_id")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_masters")
      .select(
        "master:masters!project_masters_master_same_org(master_artists(artist_id))",
      )
      .eq("project_id", projectId),
  ]);
  const artists = [
    project.data?.artist_id ?? null,
    ...(titles.data ?? []).flatMap((t) =>
      (t.master?.master_artists ?? []).map((a) => a.artist_id),
    ),
  ].filter((x): x is string => Boolean(x));
  if (artists.length === 0) return null;
  const { data } = await supabase
    .from("network_contacts")
    .select("id")
    .in("artist_id", [...new Set(artists)])
    .is("archived_at", null);
  return (
    <>
      {(data ?? []).map((c) => (
        <ContactLinkOffer key={c.id} projectId={projectId} contactId={c.id} />
      ))}
    </>
  );
}
