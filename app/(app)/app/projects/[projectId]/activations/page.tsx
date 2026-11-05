import { redirect } from "next/navigation";

import { filterOf } from "@/components/activations/journey/activation-list";
import { ActivationsFrame } from "@/components/activations/journey/activations-frame";
import { loadActivationsBoard } from "@/lib/activations/board";
import { filtersOf } from "@/lib/activations/journey";
import { routes } from "@/lib/auth/redirects";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { viewHref } from "@/lib/ui/view-href";

/**
 * Marketing › Activations (proto « Projet complet », 18/10): one page, the
 * list on the left and the open activation on the right. Without an
 * activation open, the first one the viewer acts on opens (else the first
 * of the filter, else the first); with none yet, the levers to prepare.
 */
export default async function ProjectActivationsPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/activations">) {
  const { projectId } = await params;
  const query = await searchParams;
  await requireLaunchedProject(projectId);
  const filter = filterOf(query.vue);
  const { summaries } = await loadActivationsBoard(projectId);
  const inFilter = summaries.filter((a) =>
    filtersOf(a, a.actions).includes(filter),
  );
  const first =
    inFilter.find((a) => a.actions.some((x) => x.who.viewer)) ??
    inFilter[0] ??
    summaries[0];
  if (first)
    redirect(
      viewHref(routes.projectActivation(projectId, first.id), {
        vue: filter === "open" ? null : filter,
      }),
    );
  return (
    <ActivationsFrame projectId={projectId} openId={null} filter={filter} />
  );
}
