import { notFound } from "next/navigation";

import { ConceptionCallSheet } from "@/components/design/conception-call-sheet";
import { ConceptionDirectionCard } from "@/components/design/conception-direction-card";
import { AttachCallButton } from "@/components/design/exchanges/attach-call-button";
import { ConceptionExchanges } from "@/components/design/exchanges/conception-exchanges";
import { ConceptionEntry } from "@/components/design/conception-entry";
import { ConceptionJourney } from "@/components/design/conception-journey";
import { ConceptionIdentityCard } from "@/components/design/identity/conception-identity-card";
import { ConceptionTabs } from "@/components/design/conception-tabs";
import {
  DesignNeedsStrategy,
  EarlyDepositLink,
} from "@/components/design/design-needs-strategy";
import { ConceptionClosureSection } from "@/components/design/closure/conception-closure-section";
import { ConceptionValidationSection } from "@/components/design/conception-validation-section";
import { requireApproved } from "@/lib/auth/dal";
import { designSheetData } from "@/lib/design/call-sheet-data";
import { loadConception } from "@/lib/design/conception";
import { loadDesignExchanges } from "@/lib/design/exchanges";
import { journey } from "@/lib/design/journey";
import { loadJourneyInput } from "@/lib/design/journey-data";
import { loadReleaseIdentity } from "@/lib/design/release-identity";
import { can } from "@/lib/auth/access";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import { conceptionState } from "@/lib/design/states";
import { loadMembers, loadPendingValidation } from "@/lib/framing/related";
import { loadBriefSheets } from "@/lib/design/brief-sheets";
import { loadConceptionClosure } from "@/lib/design/handoff-plan";
import { fr } from "@/lib/i18n/fr";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
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
  const members = await loadMembers(access);
  const [callSheet, pendingValidation, sheets, identity, exchanges] =
    await Promise.all([
      data.canAdd ? designSheetData(project, data) : null,
      stage ? loadPendingValidation(stage.id, members) : null,
      data.started ? loadSheetSummaries(projectId) : [],
      loadReleaseIdentity(projectId, members),
      loadDesignExchanges(projectId, data),
    ]);
  const input = await loadJourneyInput(
    { id: project.id, title: project.title, artistName: project.artistName },
    access,
    data,
    sheets,
  );
  const path = journey(input);
  // MKT-C2-13: once validated, the closing and its transfer plan.
  const closure =
    stage?.state === "validated"
      ? await loadConceptionClosure(
          projectId,
          data,
          sheets,
          await loadBriefSheets(projectId),
        )
      : null;
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
      {closure && (
        <ConceptionClosureSection
          projectId={projectId}
          closure={closure}
          isOwner={data.isOwner}
          canReopen={can(access, "validate")}
        />
      )}
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
            />
          )
        }
        exchanges={
          (data.started || exchanges.exchanges.length > 0) && (
            <ConceptionExchanges
              projectId={projectId}
              exchanges={exchanges.exchanges}
              skippedReason={input.noExchangeReason}
              actions={
                data.started &&
                data.canAdd && (
                  <>
                    {callSheet && (
                      <ConceptionCallSheet
                        projectId={projectId}
                        data={callSheet}
                      />
                    )}
                    <AttachCallButton
                      projectId={projectId}
                      calls={exchanges.attachable}
                      deliverables={data.deliverables.map((d) => ({
                        id: d.id,
                        title: d.title,
                      }))}
                    />
                  </>
                )
              }
            />
          )
        }
        identity={
          <ConceptionIdentityCard
            projectId={projectId}
            identity={identity}
            canWrite={data.canWrite}
            isOwner={data.isOwner}
            open={data.canAdd}
            validates={can(access, "validate")}
          />
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
        <ConceptionValidationSection
          projectId={projectId}
          stage={stage}
          pendingValidation={pendingValidation}
          mePersonId={access.personId}
          input={input}
        />
      )}
    </div>
  );
}
