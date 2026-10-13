import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

/**
 * A creative proposal by its id (MKT-C2-10): where a notification or a
 * retouche task leads — the work page of its deliverable, scrolled to the
 * proposal. Read with the viewer's session (RLS); unknown, the Conception.
 */
export default async function DesignVersionPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/versions/[versionId]">) {
  const { projectId, versionId } = await params;
  await requireApproved();
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("design_versions")
    .select("deliverable_id")
    .eq("id", versionId)
    .eq("project_id", projectId)
    .maybeSingle();
  const { data: deliverable } = version?.deliverable_id
    ? await supabase
        .from("design_deliverables")
        .select("id")
        .eq("project_id", projectId)
        .eq("strategy_deliverable_id", version.deliverable_id)
        .maybeSingle()
    : { data: null };
  redirect(
    deliverable
      ? `${routes.projectDesignWork(projectId, deliverable.id)}#version-${versionId}`
      : routes.projectDesign(projectId),
  );
}
