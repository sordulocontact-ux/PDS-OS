import { notFound } from "next/navigation";

import { ImportPanel } from "@/components/framing/import-panel";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { BriefReminder } from "@/components/strategy/brief-reminder";
import { DimensionWork } from "@/components/strategy/dimension-work";
import { ProposeChoices } from "@/components/strategy/propose-choices";
import { StrategyCallSheet } from "@/components/strategy/strategy-call-sheet";
import { StrategyDictation } from "@/components/strategy/strategy-dictation";
import { StrategyDimensionPanel } from "@/components/strategy/strategy-dimension-panel";
import { StrategyEntry } from "@/components/strategy/strategy-entry";
import { StrategyPilotage } from "@/components/strategy/strategy-pilotage";
import { StrategyNeedsFraming } from "@/components/strategy/strategy-needs-framing";
import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { workflowGate } from "@/lib/plan/queries";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudget } from "@/lib/budget/queries";
import { todayInParis } from "@/lib/insights/dates";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectKindLabel } from "@/lib/projects/labels";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { importStrategyReport } from "@/lib/strategy/actions/import";
import { isFramingValidated } from "@/lib/projects/types";
import { strategySheetData } from "@/lib/strategy/call-sheet-data";
import {
  dimensionStatuses,
  isStrategyDimension,
} from "@/lib/strategy/dimensions";
import { loadStrategy } from "@/lib/strategy/queries";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * Launch strategy stage, built on the validated Brief: first its entry
 * (context, « Commencer la stratégie », « Préparer un échange »), then the
 * pilotage of its eight dimensions, each worked in its panel (?d=).
 */
export default async function StrategyPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy">) {
  const { projectId } = await params;
  const asked = (await searchParams).d;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  // The strategy is built on the validated Brief: nothing to open before.
  if (!isFramingValidated(project.stages)) {
    return (
      <StrategyNeedsFraming
        projectId={projectId}
        canEdit={canEditProject(access, project)}
      />
    );
  }
  // The Stratégie starts from the Plan du Projet, never on its own.
  const gate = await workflowGate(project, "strategy");
  if (gate)
    return (
      <WorkflowLocked
        projectId={projectId}
        name={fr.framingIntel.plan.workflows.strategy}
        {...gate}
      />
    );
  const [data, budget] = await Promise.all([
    loadStrategy(projectId, access),
    loadBudget(projectId),
  ]);
  if (!data) notFound();
  const t = fr.strategy;
  const state = data.stage?.state ?? "not_started";
  const isOwner = canEditProject(access, project);
  const callSheet =
    isOwner && (state === "not_started" || state === "in_progress")
      ? await strategySheetData(project, data, budget.lines)
      : null;

  // First opening: the context and the two ways in, no dashboard yet.
  if (!data.started)
    return (
      <StrategyEntry
        projectId={projectId}
        context={{
          title: project.title,
          artistName: project.artistName,
          kind: projectKindLabel({
            type: project.type,
            musicFormat: project.musicFormat,
            contentFormatName: project.contentFormat?.name ?? null,
          }),
          releaseDate: data.referenceDate,
        }}
        callReportCount={data.callReportCount}
        canEdit={isOwner}
        callSheet={callSheet}
      />
    );

  // The owner writes only while the strategy is in progress; the database
  // enforces it (strategy_is_editable), this only decides what is offered.
  const canWrite = isOwner && state === "in_progress";
  const status =
    state === "not_started"
      ? t.notStarted
      : state === "in_progress"
        ? null
        : t.locked;

  const statuses = dimensionStatuses({
    ...data,
    today: todayInParis(),
    budgetLines: budget.lines,
    envelopeCents: project.budgetCents,
  });
  const open = isStrategyDimension(asked)
    ? statuses.find((d) => d.key === asked)
    : undefined;

  // docs/DESIGN.md § 4, « Sélection et formulaires en étapes »: no card around
  // the page, sections spaced out, only the answers and items outlined.
  const block = "rounded-2xl border border-border bg-background p-5";

  return (
    <div className="grid gap-12 pt-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <EditAccessProvider canEdit={canWrite}>
        <div className="flex min-w-0 flex-col gap-8">
          <StrategyDictation
            projectId={projectId}
            actions={
              <>
                <ProposeChoices projectId={projectId} />
                {callSheet && (
                  <StrategyCallSheet projectId={projectId} data={callSheet} />
                )}
              </>
            }
          >
            <h2 className="text-display-md font-semibold break-words">
              {t.title}
            </h2>
            {status && (
              <p className="text-body-md text-muted-foreground">{status}</p>
            )}
          </StrategyDictation>
          <StrategyPilotage
            projectId={projectId}
            statuses={statuses}
            current={open?.key ?? null}
          />
        </div>
        {open && (
          <StrategyDimensionPanel
            status={open}
            closeHref={routes.projectStrategy(projectId)}
          >
            <DimensionWork
              dimension={open.key}
              data={data}
              budget={budget}
              envelopeCents={project.budgetCents}
              projectId={projectId}
            />
          </StrategyDimensionPanel>
        )}
      </EditAccessProvider>

      <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-6">
        <div className={block}>
          <ValidationPanel
            stage={data.stage}
            pendingValidation={data.pendingValidation}
            projectId={projectId}
            mePersonId={access.personId}
            title={t.validation.title}
            startLabel={t.validation.start}
            startBlocked={data.briefValidated ? null : t.validation.briefFirst}
          />
        </div>
        <div className={block}>
          <BriefReminder
            brief={data.brief}
            validated={data.briefValidated}
            projectId={projectId}
          />
        </div>
        {canWrite && (
          <div className={block}>
            <ImportPanel
              reports={data.reports}
              projectId={projectId}
              importAction={importStrategyReport}
              title={t.import.title}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
