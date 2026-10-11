import { notFound } from "next/navigation";

import { InfluenceCollaboration } from "@/components/activations/influence/influence-collaboration";
import { PressTarget } from "@/components/activations/press/press-target";
import { loadActivationFiche } from "@/lib/activations/fiche";
import { loadTargets } from "@/lib/activations/targets";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.activations.tabs.targets} · ${fr.app.name}`,
};

/** One collaboration (Influence) or one press target (RP), in house. */
export default async function ActivationTargetPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]/targets/[targetId]">) {
  const { projectId, activationId, targetId } = await params;
  const access = await requireApproved();
  const fiche = await loadActivationFiche(projectId, activationId, access);
  const target = (await loadTargets(activationId)).find(
    (x) => x.id === targetId,
  );
  if (!target || fiche.activation.mode !== "internal") notFound();
  if (fiche.activation.kind === "influence")
    return (
      <InfluenceCollaboration fiche={fiche} target={target} access={access} />
    );
  if (fiche.activation.kind === "press")
    return <PressTarget fiche={fiche} target={target} access={access} />;
  notFound();
}
