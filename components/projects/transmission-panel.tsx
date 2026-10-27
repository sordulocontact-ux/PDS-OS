import Link from "next/link";

import { HandoverSummary } from "@/components/projects/handover-summary";
import { RespondPanel } from "@/components/projects/respond-panel";
import { TransmitDialog } from "@/components/projects/transmit-dialog";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { routes } from "@/lib/auth/redirects";
import { transmission } from "@/lib/i18n/fr/transmission";
import type { ProjectDetail } from "@/lib/projects/types";
import { projectStatusTone } from "@/lib/ui/state-tones";

const fr = { transmission };

// Where a project stands before launch, and the one next action for the
// viewer: the director transmits (again), the chosen manager answers.
export function TransmissionPanel({
  project,
  viewerPersonId,
  canTransmit,
  people,
}: {
  project: ProjectDetail;
  viewerPersonId: string | null;
  canTransmit: boolean;
  people: Array<{ personId: string; name: string }>;
}) {
  const t = fr.transmission.panel;
  const latest = project.assignments[0] ?? null;
  const status = project.status;
  const isAssignee =
    status === "pending" && latest?.assigneePersonId === viewerPersonId;
  const mayTransmit =
    canTransmit &&
    (status === "not_transmitted" ||
      status === "refused" ||
      status === "clarification_requested");

  let body: string = t.notTransmittedBody;
  if (latest && status === "pending")
    body = t.pendingBody(latest.assigneeName, formatDay(latest.createdAt));
  if (latest && status === "refused") body = t.refusedBody(latest.assigneeName);
  if (latest && status === "clarification_requested")
    body = t.clarificationBody(latest.assigneeName);

  return (
    <section
      aria-labelledby="status-title"
      className="flex flex-col gap-4 rounded-xl border border-border p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="status-title" className="text-sm font-medium">
              {isAssignee ? fr.transmission.respond.title : t.title}
            </h2>
            <StatusBadge tone={projectStatusTone[status]}>
              {fr.transmission.statuses[status]}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAssignee && latest
              ? fr.transmission.respond.from(
                  latest.assignedByName,
                  formatDay(latest.createdAt),
                )
              : body}
          </p>
        </div>
        {mayTransmit && people.length > 0 && (
          <div className="shrink-0">
            <TransmitDialog
              projectId={project.id}
              people={people}
              mode={
                status === "clarification_requested"
                  ? "answer"
                  : status === "refused"
                    ? "reassign"
                    : "first"
              }
              defaultAssigneeId={latest?.assigneePersonId}
            />
          </div>
        )}
      </div>

      {latest?.response &&
        (status === "refused" || status === "clarification_requested") && (
          <blockquote className="border-l-2 border-foreground pl-3 text-sm whitespace-pre-line">
            <span className="block text-xs text-muted-foreground">
              {status === "refused" ? t.reason : t.question}
            </span>
            {latest.response}
          </blockquote>
        )}

      {isAssignee && latest && (
        <>
          {latest.note && (
            <blockquote className="border-l-2 border-foreground pl-3 text-sm whitespace-pre-line">
              {latest.note}
            </blockquote>
          )}
          <HandoverSummary project={project} />
          <RespondPanel assignmentId={latest.id} />
        </>
      )}

      {mayTransmit && people.length === 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t.noManager}</p>
          <Link
            href={routes.members}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t.toMembers}
          </Link>
        </div>
      )}
    </section>
  );
}
