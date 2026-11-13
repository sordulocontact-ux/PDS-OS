import { ActivationsIndex } from "@/components/activations/journey/activations-index";
import { filterOf } from "@/lib/activations/journey";
import { requireLaunchedProject } from "@/lib/projects/queries";

/**
 * Marketing › Activations, the list (Sacha 10/11/2026): the levers to
 * prepare, then the table of the activations with its views (`vue` of the
 * URL, « En cours » by default). An activation opens its own page.
 */
export default async function ProjectActivationsPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/activations">) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  await requireLaunchedProject(projectId);
  return (
    <ActivationsIndex
      projectId={projectId}
      filter={filterOf(query.vue)}
      titleId={typeof query.titre === "string" ? query.titre : null}
    />
  );
}
