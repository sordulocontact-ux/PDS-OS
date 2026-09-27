import { notFound } from "next/navigation";

import { BriefFieldCard } from "@/components/framing/brief-field-card";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <EditAccessProvider canEdit={canWrite}>
        <Card>
          <StrategyDictation projectId={projectId}>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
            {status && (
              <p className="text-sm text-muted-foreground">{status}</p>
            )}
          </StrategyDictation>
          <CardContent className="grid divide-y divide-border">
            <div>
              <ProposeChoices projectId={projectId} />
              {data.fields.map((field) => (
                <div key={field.key}>
                  {/* Remount when the saved answers change on the server. */}
                  <StrategyChoices
                    key={`${JSON.stringify(data.choices[field.key])}-${field.value ?? ""}`}
                    field={field.key}
                    value={data.choices[field.key]}
                    suggestions={data.suggestions[field.key]}
                    projectId={projectId}
                    currentText={field.value}
                  />
                  <BriefFieldCard
                    key={`${field.key}-${field.value ?? ""}-${field.status ?? ""}`}
                    field={field}
                    label={t.fields[field.key]}
                    projectId={projectId}
                  />
                </div>
              ))}
            </div>
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
          </CardContent>
        </Card>
      </EditAccessProvider>

      <aside className="grid content-start gap-6">
        <Card>
          <CardContent>
            <ValidationPanel
              stage={data.stage}
              pendingValidation={data.pendingValidation}
              projectId={projectId}
              mePersonId={access.personId}
              title={t.validation.title}
              startLabel={t.validation.start}
              startBlocked={
                data.briefValidated ? null : t.validation.briefFirst
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BriefReminder
              brief={data.brief}
              validated={data.briefValidated}
              projectId={projectId}
            />
          </CardContent>
        </Card>
        {canWrite && (
          <Card>
            <CardContent>
              <ImportPanel
                reports={data.reports}
                projectId={projectId}
                importAction={importStrategyReport}
                title={t.import.title}
                hint={t.import.hint}
              />
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
