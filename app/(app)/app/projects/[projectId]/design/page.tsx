import { notFound } from "next/navigation";

import { ConceptionCallSheet } from "@/components/design/conception-call-sheet";
import { ConceptionDirectionCard } from "@/components/design/conception-direction-card";
import { ConceptionEntry } from "@/components/design/conception-entry";
import { ConceptionJourney } from "@/components/design/conception-journey";
import { ConceptionTabs } from "@/components/design/conception-tabs";
import {
  DesignNeedsStrategy,
  EarlyDepositLink,
} from "@/components/design/design-needs-strategy";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { sectionCardClass } from "@/components/ui/section-card";
import { requireApproved } from "@/lib/auth/dal";
import { designSheetData } from "@/lib/design/call-sheet-data";
import { loadConception } from "@/lib/design/conception";
import { journey } from "@/lib/design/journey";
import { loadJourneyInput } from "@/lib/design/journey-data";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import { conceptionState } from "@/lib/design/states";
import { loadMembers, loadPendingValidation } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conception.title} · ${fr.app.name}`,
};

/**
 * Conception, home (ticket « Conception » § 1, MKT-C2-03): its goal and the
 * dossier it ends with, the context; before the start, the two ways in — a
 * creative exchange PO prepares (main), or the direct work; once started,
 * the journey (next action with where it opens, six steps, blockers), the
 * release's direction apart from each deliverable, and the dossier's
 * validation (« Valider la conception », reached from the next action).
 */
export default async function DesignPage({
  params,
}: PageProps<"/app/projects/[projectId]/design">) {
  const { projectId } = await params;
  const [access, project, creatives] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    listProjectCreatives(projectId),
  ]);
  // The creative team (not the owner) may deposit its leads in Fichiers
  // before the Conception opens.
  const creative =
    !canEditProject(access, project) &&
    creatives.some((c) => c.personId === access.personId);
  // The Conception starts from the decisions validated in the Stratégie.
  if (!isStageValidated(project.stages, "launch_strategy")) {
    return (
      <DesignNeedsStrategy
        projectId={projectId}
        canEdit={canEditProject(access, project)}
        creative={creative}
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
  const input = await loadJourneyInput(
    { id: project.id, title: project.title, artistName: project.artistName },
    access,
    data,
    sheets,
  );
  const path = journey(input);
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
      {creative && !data.started && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-body-md text-muted-foreground">
            {fr.design.earlyDeposit}
          </p>
          <EarlyDepositLink projectId={projectId} size="sm" />
        </div>
      )}
      <ConceptionEntry
        projectId={projectId}
        context={{ title: project.title, artistName: project.artistName }}
        data={data}
        moduleState={state}
        sheets={sheets}
        callSheet={callSheet}
        journey={
          data.started && (
            <ConceptionJourney
              steps={path.steps}
              next={path.next}
              blockers={path.blockers}
              exchangeAction={
                callSheet && (
                  <ConceptionCallSheet projectId={projectId} data={callSheet} />
                )
              }
            />
          )
        }
        direction={
          data.started && (
            <ConceptionDirectionCard
              projectId={projectId}
              state={input.direction.state}
              answered={input.direction.answered}
            />
          )
        }
      />
      {/* Once the work is open: the dossier is validated as a whole, apart
          from the decisions on each object (step 5 of the journey). */}
      {stage && (
        <section
          id="conception-validation"
          aria-label={fr.conceptionJourney.validationTitle}
          className={cn(sectionCardClass, "scroll-mt-6")}
        >
          <ValidationPanel
            stage={stage}
            pendingValidation={pendingValidation}
            projectId={projectId}
            mePersonId={access.personId}
            title={fr.conceptionJourney.validationTitle}
            startLabel={fr.design.validation.start}
          />
        </section>
      )}
    </div>
  );
}
