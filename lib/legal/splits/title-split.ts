import "server-only";

import { unitsOf, type SplitRole } from "@/lib/legal/splits/shares";
import { createClient } from "@/lib/supabase/server";

// The publishing split of a title as the Juridique confirmed it (ticket
// Juridique 04), for the title's page: the latest version confirmed by
// everyone, in any project of the title. Read with the user's session: only
// manage_legal reads it (RLS), anyone else gets nothing.

export type ConfirmedSplit = {
  versionId: string;
  version: number;
  projectTitle: string;
  confirmedSince: string | null;
  lines: Array<{
    name: string;
    role: SplitRole;
    units: number;
    contactId: string | null;
  }>;
};

export async function confirmedSplitOf(
  masterId: string,
): Promise<ConfirmedSplit | null> {
  const supabase = await createClient();
  const { data: sheets } = await supabase
    .from("legal_split_sheets")
    .select("id, project_id")
    .eq("master_id", masterId);
  if (!sheets?.length) return null;
  const { data: version } = await supabase
    .from("legal_split_versions")
    .select("id, sheet_id, version, proposed_at")
    .in(
      "sheet_id",
      sheets.map((s) => s.id),
    )
    .eq("status", "confirmed")
    .order("proposed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!version) return null;
  const projectId = sheets.find((s) => s.id === version.sheet_id)?.project_id;
  const [{ data: entries }, { data: project }] = await Promise.all([
    supabase
      .from("legal_split_entries")
      .select("name, role, share, contact_id")
      .eq("version_id", version.id)
      .order("position"),
    supabase
      .from("projects")
      .select("title")
      .eq("id", projectId ?? "")
      .maybeSingle(),
  ]);
  return {
    versionId: version.id,
    version: version.version,
    projectTitle: project?.title ?? "",
    confirmedSince: version.proposed_at,
    lines: (entries ?? []).map((e) => ({
      name: e.name,
      role: e.role as SplitRole,
      units: unitsOf(String(e.share)) ?? 0,
      contactId: e.contact_id,
    })),
  };
}
