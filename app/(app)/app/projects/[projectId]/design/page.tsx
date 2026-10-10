import { notFound } from "next/navigation";

import { ConceptionEntry } from "@/components/design/conception-entry";
import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { sectionCardClass } from "@/components/ui/section-card";
import { requireApproved } from "@/lib/auth/dal";
import { designSheetData } from "@/lib/design/call-sheet-data";
import { loadConception } from "@/lib/design/conception";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import { conceptionState } from "@/lib/design/states";
import { loadMembers, loadPendingValidation } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conception.title} · ${fr.app.name}`,
};

/**
 * Conception, home (ticket « Conception » § 1): the context, the
 * deliverables the validated Stratégie committed to and the needs added
 * since, then the two ways in — a creative exchange PO prepares, or the
 * direct work (/design/work).
 */
export default async function DesignPage({
  params,
}: PageProps<"/app/projects/[projectId]/design">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  // The Conception starts from the decisions validated in the Stratégie.
  if (!isStageValidated(project.stages, "launch_strategy")) {
    return (
      <DesignNeedsStrategy
        projectId={projectId}
        canEdit={canEditProject(access, project)}
      />
    );
  }
  const data = await loadConception(project, access);
  if (!data) notFound();

  const stage = data.started ? data.stage : null;
  const [callSheet, pendingValidation, sheets] = await Promise.all([
    data.canAdd ? designSheetData(project, data) : null,
    stage
      ? loadMembers(access).then((members) =>
          loadPendingValidation(stage.id, members),
        )
      : null,
    data.started ? loadSheetSummaries(projectId) : [],
  ]);
  // Where the Conception stands, computed by code (lib/design/states.ts).
  const state = conceptionState({
    started: data.started,
    toArbitrate:
      data.intentions.filter((i) => i.status === "proposed").length +
      data.references.filter((r) => r.links.length === 0).length +
      sheets.filter((s) => s.status === "rejected").length,
    sheets: sheets.map((s) => s.status),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* The other pages exist once the work is open. */}
      {data.started && <ConceptionTabs projectId={projectId} />}
      <ConceptionEntry
        projectId={projectId}
        context={{ title: project.title, artistName: project.artistName }}
        data={data}
        moduleState={state}
        sheets={sheets}
        callSheet={callSheet}
      />
      {/* Once the work is open: the Conception is validated as a whole. */}
      {stage && (
        <div className={sectionCardClass}>
          <ValidationPanel
            stage={stage}
            pendingValidation={pendingValidation}
            projectId={projectId}
            mePersonId={access.personId}
            title={fr.design.validation.title}
            startLabel={fr.design.validation.start}
          />
        </div>
      )}
    </div>
  );
}
