import { ActivationsReview } from "@/components/activations/activations-review";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { ReviewForm } from "@/components/review/review-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { loadActivationsBoard } from "@/lib/activations/board";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadReview } from "@/lib/review/queries";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

const t = fr.projectReview;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Suivi & bilan: where each workflow stands, what each activation
 * brings to the review (its three axes and reserves), the review written
 * by the owner, then « Bilan & clôture » validated by the direction, which
 * closes the project (docs/ARCHITECTURE.md § 8 nonies).
 */
export default async function ProjectReviewPage({
  params,
}: PageProps<"/app/projects/[projectId]/review">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [data, states, activations] = await Promise.all([
    loadReview(projectId, access),
    loadWorkflowStates(projectId),
    loadActivationsBoard(projectId),
  ]);

  const state = data.stage?.state ?? "not_started";
  const inProgress = state === "in_progress";
  const canEdit = canEditProject(access, project) && inProgress;
  const status =
    state === "validated"
      ? t.closed
      : state === "not_started"
        ? t.notStarted
        : inProgress
          ? null
          : t.locked;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          {states && (
            <Card>
              <CardHeader>
                <CardTitle>{t.workflows}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {states.workflows.map((workflow) => {
                    const s = states.states[workflow];
                    return (
                      <li
                        key={workflow}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-sm"
                      >
                        <span className="font-medium">
                          {fr.shell.project.sidebar[workflow]}
                        </span>
                        {s && s !== "restricted" ? (
                          <span className="flex min-w-0 items-baseline gap-2">
                            <StatusDot
                              tone={workflowStatusTone[s.status]}
                              label={fr.workflowStatus.statuses[s.status]}
                              showLabel
                            />
                            <span className="break-words text-muted-foreground">
                              {s.reason}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {fr.workflowStatus.restricted}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
          <ActivationsReview
            projectId={projectId}
            rows={activations.summaries}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t.stage}</CardTitle>
              {status && (
                <p className="text-sm text-muted-foreground">{status}</p>
              )}
            </CardHeader>
            <CardContent>
              <ReviewForm
                projectId={projectId}
                review={data.review}
                canEdit={canEdit}
              />
            </CardContent>
          </Card>
        </div>
        <aside className="grid content-start gap-6">
          <Card>
            <CardContent className="grid gap-3">
              <ValidationPanel
                stage={data.stage}
                pendingValidation={data.pendingValidation}
                projectId={projectId}
                mePersonId={access.personId}
                title={t.stage}
                startLabel={t.start}
              />
              {inProgress && (
                <p className="text-xs text-muted-foreground">{t.closeHint}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
