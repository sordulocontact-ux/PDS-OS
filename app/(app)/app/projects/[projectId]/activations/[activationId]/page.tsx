import { ActivationPageView } from "@/components/activations/journey/activation-page-view";

/** One activation on its own page (Sacha 10/11/2026): its frieze,
 * « Maintenant », its module, « Informations » (docs/ARCHITECTURE.md
 * § 8 duodecies). */
export default async function ActivationPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]">) {
  const { projectId, activationId } = await params;
  return (
    <ActivationPageView projectId={projectId} activationId={activationId} />
  );
}
