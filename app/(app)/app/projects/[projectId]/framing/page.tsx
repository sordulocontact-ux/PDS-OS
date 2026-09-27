import { notFound } from "next/navigation";

import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { FramingDictation } from "@/components/framing/framing-dictation";
import { FramingNeedsCall } from "@/components/framing/framing-needs-call";
import { NeedsSection } from "@/components/framing/needs-section";
import { OpenPointsSection } from "@/components/framing/open-points-section";
import { TasksSection } from "@/components/framing/tasks-section";
import { TeamSection } from "@/components/framing/team-section";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isFramingOpen, loadFraming } from "@/lib/framing/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * Framing stage: the Brief on one page, pre-filled from calls (automatically,
 * once a call report is ready), edited in place.
 * It starts from a call: locked until the project has a call report. It
 * starts "in progress" itself the moment that first report lands
 * (lib/framing/import-report.ts) — nobody clicks a "start" button.
 *
 * The Brief and its side column sit directly in the project's content area
 * (no enclosing card — the fields and sections already carry their own
 * separation). "Demander la validation" itself lives in the project header,
 * next to the title (app/(app)/.../layout.tsx); this page's own Validation
 * block only shows the state and, once asked, the decision.
 */
export default async function FramingPage({
  params,
}: PageProps<"/app/projects/[projectId]/framing">) {
  const { projectId } = await params;
  const [access, project, framingOpen] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    isFramingOpen(projectId),
  ]);
  if (!framingOpen) {
    return (
      <FramingNeedsCall
        projectId={projectId}
        canEdit={canEditProject(access, project)}
      />
    );
  }
  const data = await loadFraming(projectId, access);
  if (!data) notFound();
  const me = access.personId;

  return (
    <>
      <FramingDictation projectId={projectId} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-3">
          {data.fields.map((field) => (
            <BriefFieldCard
              key={`${field.key}-${field.value ?? ""}-${field.status ?? ""}`}
              field={field}
              label={fr.framing.fields[field.key]}
              projectId={projectId}
            />
          ))}
        </div>

        <aside className="grid content-start gap-6">
          <ValidationPanel
            stage={data.stage}
            pendingValidation={data.pendingValidation}
            projectId={projectId}
            mePersonId={me}
            title={fr.framing.validation.title}
            startLabel={fr.framing.validation.start}
          />

          <PageSection id="framing-needs" title={fr.framing.needs.title}>
            <NeedsSection needs={data.needs} projectId={projectId} />
          </PageSection>

          <PageSection id="framing-team" title={fr.framing.team.title}>
            <TeamSection team={data.team} projectId={projectId} />
          </PageSection>

          <PageSection
            id="framing-open-points"
            title={fr.framing.openPoints.title}
          >
            <OpenPointsSection points={data.openPoints} projectId={projectId} />
          </PageSection>

          <PageSection id="framing-tasks" title={fr.framing.tasks.title}>
            <TasksSection
              tasks={data.tasks}
              proposedActions={data.proposedActions}
              members={data.members}
              projectId={projectId}
              mePersonId={me}
            />
          </PageSection>
        </aside>
      </div>
    </>
  );
}
