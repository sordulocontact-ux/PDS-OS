import { notFound } from "next/navigation";

import { CollaborationsTable } from "@/components/activations/influence/collaborations-table";
import { PressTargetsSection } from "@/components/activations/press/press-targets-section";
import { AddTargetButton } from "@/components/activations/targets/add-target-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { loadActivationFiche } from "@/lib/activations/fiche";
import { collaborationRows } from "@/lib/activations/influence/collaborations";
import { loadInfluenceData } from "@/lib/activations/influence/queries";
import { loadMessages } from "@/lib/activations/messages/queries";
import { loadSheets } from "@/lib/activations/sheet-queries";
import { loadTargets } from "@/lib/activations/targets";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.activations.tabs.targets} · ${fr.app.name}`,
};

/** In house : the collaborations of an influence campaign, or the targets
 * of a press campaign, each a relation to a profile of the Réseau. */
export default async function ActivationTargetsPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]/targets">) {
  const { projectId, activationId } = await params;
  const access = await requireApproved();
  const fiche = await loadActivationFiche(projectId, activationId, access);
  const { activation: a, board, canWrite } = fiche;
  if (a.mode !== "internal" || (a.kind !== "influence" && a.kind !== "press"))
    notFound();
  if (a.kind === "press") return <PressTargetsSection fiche={fiche} />;

  const [targets, sheets, messages, influence] = await Promise.all([
    loadTargets(a.id),
    loadSheets(a.id, a.kind),
    loadMessages(a.id),
    loadInfluenceData(a.id),
  ]);
  const rows = collaborationRows(
    targets,
    sheets,
    messages,
    influence,
    board.data.evidences,
  );
  const t = fr.activationInfluence.list;
  return (
    <PageSection
      id="collaborations"
      title={t.title}
      description={t.description}
      action={
        canWrite && (
          <AddTargetButton
            projectId={projectId}
            activationId={a.id}
            press={false}
          />
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyNote>{fr.activationWork.targets.noTargets}</EmptyNote>
      ) : (
        <CollaborationsTable
          projectId={projectId}
          activationId={a.id}
          rows={rows}
        />
      )}
    </PageSection>
  );
}
