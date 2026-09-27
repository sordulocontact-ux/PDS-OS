import { notFound } from "next/navigation";

import { ImportPanel } from "@/components/framing/import-panel";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { BriefReminder } from "@/components/strategy/brief-reminder";
import { CalendarSection } from "@/components/strategy/calendar-section";
import { DeliverablesSection } from "@/components/strategy/deliverables-section";
import { LeversSection } from "@/components/strategy/levers-section";
import { ProposeChoices } from "@/components/strategy/propose-choices";
import { StrategyChoices } from "@/components/strategy/strategy-choices";
import { StrategyDictation } from "@/components/strategy/strategy-dictation";
import { StrategyNeedsFraming } from "@/components/strategy/strategy-needs-framing";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { importStrategyReport } from "@/lib/strategy/actions/import";
import { isFramingValidated } from "@/lib/projects/types";
import { loadStrategy } from "@/lib/strategy/queries";
import { allInOrder } from "@/lib/utils/parallel";

/** Launch strategy stage: the Strategy on one page, built on the validated Brief. */
export default async function StrategyPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy">) {
  const { projectId } = await params;
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
  const data = await loadStrategy(projectId, access);
  if (!data) notFound();
  const t = fr.strategy;
  const state = data.stage?.state ?? "not_started";

  // The owner writes only while the strategy is in progress; the database
  // enforces it (strategy_is_editable), this only decides what is offered.
  const canWrite = canEditProject(access, project) && state === "in_progress";
  const status =
    state === "not_started"
      ? t.notStarted
      : state === "in_progress"
        ? null
        : t.locked;

  // docs/DESIGN.md § 4, « Sélection et formulaires en étapes »: no card around
  // the page, sections spaced out, only the answers and items outlined.
  const block = "rounded-2xl border border-border bg-background p-5";

  return (
    <div className="grid gap-12 pt-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <EditAccessProvider canEdit={canWrite}>
        <div className="flex min-w-0 flex-col gap-12">
          <StrategyDictation
            projectId={projectId}
            actions={<ProposeChoices projectId={projectId} />}
          >
            <h2 className="text-display-md font-semibold break-words">
              {t.title}
            </h2>
            {status && (
              <p className="text-body-md text-muted-foreground">{status}</p>
            )}
          </StrategyDictation>
          {data.fields.map((field) => (
            // Remount when the saved answers change on the server.
            <StrategyChoices
              key={`${field.key}-${JSON.stringify(data.choices[field.key])}-${field.value ?? ""}-${field.status ?? ""}`}
              field={field}
              value={data.choices[field.key]}
              suggestions={data.suggestions[field.key]}
              projectId={projectId}
            />
          ))}
          <LeversSection
            levers={data.levers}
            openNeeds={data.openNeeds}
            projectId={projectId}
          />
          <DeliverablesSection
            deliverables={data.deliverables}
            levers={data.levers}
            members={data.members}
            projectId={projectId}
          />
          <CalendarSection
            milestones={data.milestones}
            deliverables={data.deliverables}
            referenceDate={data.referenceDate}
            projectId={projectId}
          />
        </div>
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
