import { notFound } from "next/navigation";

import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { FramingDictation } from "@/components/framing/framing-dictation";
import { FramingNeedsCall } from "@/components/framing/framing-needs-call";
import { NeedsSection } from "@/components/framing/needs-section";
import { OpenPointsSection } from "@/components/framing/open-points-section";
import { TasksSection } from "@/components/framing/tasks-section";
import { TeamSection } from "@/components/framing/team-section";
import { ValidationPanel } from "@/components/framing/validation-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isFramingOpen, loadFraming } from "@/lib/framing/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { fr } from "@/lib/i18n/fr";

/**
 * Framing stage: the Brief on one page, pre-filled from calls (automatically,
 * once a call report is ready), edited in place.
 * It starts from a call: locked until the project has a call report.
 */
export default async function FramingPage({
  params,
}: PageProps<"/app/projects/[projectId]/framing">) {
  const access = await requireApproved();
  const { projectId } = await params;
  const project = await requireLaunchedProject(projectId);
  if (!(await isFramingOpen(projectId))) {
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <FramingDictation projectId={projectId}>
          <CardTitle>{fr.framing.title}</CardTitle>
          <CardDescription>{fr.framing.description}</CardDescription>
        </FramingDictation>
        <CardContent className="grid divide-y divide-border">
          <div>
            {data.fields.map((field) => (
              <BriefFieldCard
                key={`${field.key}-${field.value ?? ""}-${field.status ?? ""}`}
                field={field}
                label={fr.framing.fields[field.key]}
                projectId={projectId}
              />
            ))}
          </div>
          <NeedsSection needs={data.needs} projectId={projectId} />
          <TeamSection team={data.team} projectId={projectId} />
        </CardContent>
      </Card>

      <aside className="grid content-start gap-6">
        <Card>
          <CardContent>
            <ValidationPanel
              stage={data.stage}
              pendingValidation={data.pendingValidation}
              members={data.validators}
              projectId={projectId}
              mePersonId={me}
              title={fr.framing.validation.title}
              startLabel={fr.framing.validation.start}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <OpenPointsSection points={data.openPoints} projectId={projectId} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <TasksSection
              tasks={data.tasks}
              proposedActions={data.proposedActions}
              members={data.members}
              projectId={projectId}
              mePersonId={me}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
