import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

// The former page of one collaboration (Influence) or one press target (RP):
// now a folded card of the activation's page (proto « Projet complet »),
// opened at its anchor. Kept so notifications and tasks keep working.
export default async function FormerTargetPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]/targets/[targetId]">) {
  const { projectId, activationId, targetId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketing_activations")
    .select("kind")
    .eq("id", activationId)
    .maybeSingle();
  const anchor = data?.kind === "press" ? "media" : "collab";
  redirect(
    `${routes.projectActivation(projectId, activationId)}#${anchor}-${targetId}`,
  );
}
