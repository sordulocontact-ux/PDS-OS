import "server-only";

import { createClient } from "@/lib/supabase/server";

export type UsualRevisions = { value: number; project: string };

/**
 * The mix engineer's usual revisions (proto `master-v2.html`, « Réseau ·
 * leurs conditions habituelles »): those of the latest Brief of another
 * project with the same engineer, and that project's title. The Réseau
 * keeps no such field: what was agreed last time is what PDS OS knows.
 */
export async function loadUsualRevisions(
  projectId: string,
  engineer: { contactId: string | null; personId: string | null },
): Promise<UsualRevisions | null> {
  if (!engineer.contactId && !engineer.personId) return null;
  const supabase = await createClient();
  const query = supabase
    .from("master_briefs")
    .select("revisions, project:projects!master_briefs_project_same_org(title)")
    .neq("project_id", projectId)
    .not("revisions", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  const { data } = await (
    engineer.contactId
      ? query.eq("mix_contact_id", engineer.contactId)
      : query.eq("mix_person_id", engineer.personId!)
  ).maybeSingle();
  if (!data || data.revisions === null) return null;
  return { value: data.revisions, project: data.project?.title ?? "" };
}
