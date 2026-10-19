import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

/** A Fiche Livrable by its id (notifications, Production's links): its
 * card in the Fiches Livrables step. */
export default async function DesignSheetPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/sheets/[sheetId]">) {
  const { projectId, sheetId } = await params;
  redirect(routes.projectDesignSheet(projectId, sheetId));
}
