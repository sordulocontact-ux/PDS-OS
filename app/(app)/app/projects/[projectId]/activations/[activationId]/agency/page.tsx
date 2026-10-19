import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

// The former tab « agency » of an activation: its part is now in the
// activation's single page (proto « Projet complet », 18/10), at its anchor.
// Kept so notifications, tasks and bookmarks still open the right place.
export default async function FormerAgencyPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]/agency">) {
  const { projectId, activationId } = await params;
  redirect(`${routes.projectActivation(projectId, activationId)}#agency`);
}
