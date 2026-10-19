import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

/**
 * A validation request of the Conception (notifications, Validations): the
 * decision is taken in its step — the Direction artistique, or the sheet's
 * card in the Fiches Livrables (proto « Projet complet »).
 */
export default async function DesignDecisionPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/decisions/[submissionId]">) {
  const { projectId, submissionId } = await params;
  await requireApproved();
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_submissions")
    .select("kind, sheet_id")
    .eq("id", submissionId)
    .eq("project_id", projectId)
    .maybeSingle();
  redirect(
    data?.kind === "sheet" && data.sheet_id
      ? routes.projectDesignSheet(projectId, data.sheet_id)
      : routes.projectDesignStep(projectId, "direction"),
  );
}
