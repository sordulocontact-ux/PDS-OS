import { filterOf } from "@/components/activations/journey/activation-list";
import { ActivationsFrame } from "@/components/activations/journey/activations-frame";

/** One activation open on the right of the list (proto actPage): its
 * frieze, « Maintenant », its module, « Informations » (docs/ARCHITECTURE.md
 * § 8 duodecies). */
export default async function ActivationPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]">) {
  const [{ projectId, activationId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <ActivationsFrame
      projectId={projectId}
      openId={activationId}
      filter={filterOf(query.vue)}
    />
  );
}
