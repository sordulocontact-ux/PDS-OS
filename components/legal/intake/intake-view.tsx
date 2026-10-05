import { DossierPanel } from "@/components/legal/intake/dossier-panel";
import { IntakeWorkspace } from "@/components/legal/intake/intake-workspace";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { fr } from "@/lib/i18n/fr";
import type { Intake } from "@/lib/legal/intake/queries";
import type { LegalInventory } from "@/lib/legal/types";

/** Juridique's second step: the conversation, the dossier beside it (under
 * it on a narrow screen). */
export function IntakeView({
  projectId,
  intake,
  inventory,
  initialQuestion,
}: {
  projectId: string;
  intake: Intake;
  inventory: LegalInventory;
  initialQuestion: string | null;
}) {
  const t = fr.legal.intake;
  return (
    <div className="grid gap-8">
      <ProjectPageHeader title={t.title} description={t.description} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <IntakeWorkspace
          projectId={projectId}
          questions={intake.questions}
          initialQuestion={initialQuestion}
        />
        <DossierPanel
          projectId={projectId}
          inventory={inventory}
          clearances={intake.clearances}
        />
      </div>
    </div>
  );
}
