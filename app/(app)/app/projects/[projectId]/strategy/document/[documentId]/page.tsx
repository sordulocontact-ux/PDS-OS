import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

/**
 * One version of a strategy document, by its id (a review notification only
 * knows the document): opens the Brief de sortie, the Plan de sortie or the
 * Dossier de presse at that version. Read with the user's session: RLS decides.
 */
export default async function StrategyDocumentPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/document/[documentId]">) {
  const { projectId, documentId } = await params;
  if (!z.uuid().safeParse(documentId).success) notFound();
  await requireApproved();
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("strategy_documents")
    .select("kind, version")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!doc) notFound();
  redirect(
    doc.kind === "release_plan"
      ? `${routes.projectStrategyReleasePlan(projectId, 8)}&v=${doc.version}`
      : doc.kind === "press_kit"
        ? `${routes.projectStrategyPressKit(projectId, 8)}&v=${doc.version}`
        : doc.kind === "brief"
          ? routes.projectStrategyBriefVersion(projectId, doc.version)
          : routes.projectStrategy(projectId),
  );
}
