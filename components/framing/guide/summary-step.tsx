import Link from "next/link";

import { ApproveButton } from "@/components/framing/guide/approve-button";
import { BriefFacts } from "@/components/framing/guide/brief-facts";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { OpenPointsSection } from "@/components/framing/open-points-section";
import { RequestValidationButton } from "@/components/framing/request-validation-button";
import { TasksSection } from "@/components/framing/tasks-section";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { briefFacts, briefObjective } from "@/lib/framing/brief-summary";
import { framingTodos, type FramingView } from "@/lib/framing/guide";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

const RECAP_FACTS = ["timing", "needs", "activations", "team"];

/** The Brief at a glance, what is left to do, and the validation. */
export function SummaryStep({
  data,
  projectId,
  mePersonId,
  canEdit,
  hrefOf,
  briefHref,
}: {
  data: FramingData;
  projectId: string;
  mePersonId: string | null;
  canEdit: boolean;
  hrefOf: (view: FramingView) => string;
  briefHref: string;
}) {
  const t = fr.framingGuide.summary;
  const todos = framingTodos(data);
  const pending = data.pendingValidation;
  const canRequest = canEdit && data.stage?.state === "in_progress" && !pending;

  return (
    <div className="flex flex-col gap-6">
      <FramingStepCard
        eyebrow={t.eyebrow}
        title={briefObjective(data) ?? t.noObjective}
        actions={
          <>
            <Link
              href={briefHref}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {t.openBrief}
            </Link>
            {canRequest && data.stage && (
              <RequestValidationButton
                projectId={projectId}
                stageId={data.stage.id}
                size="lg"
              />
            )}
            {pending && pending.validatorPersonId === mePersonId && (
              <ApproveButton projectId={projectId} validationId={pending.id} />
            )}
          </>
        }
      >
        <BriefFacts
          facts={briefFacts(data).filter((f) => RECAP_FACTS.includes(f.key))}
          columns={4}
        />
      </FramingStepCard>

      <PageSection id="framing-todo" title={t.todoTitle}>
        {todos.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{t.todoEmpty}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {todos.map((todo) => (
              <li key={todo.key}>
                <Link
                  href={
                    todo.view === "summary"
                      ? "#framing-open-points"
                      : hrefOf(todo.view)
                  }
                  className="flex h-full flex-col gap-0.5 rounded-2xl bg-[var(--surface-tint)] px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-pressed)]"
                >
                  <span className="text-body-md font-semibold break-words">
                    {todo.label}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {todo.detail}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          {/* Asking is the card's button; the panel shows the wait and the
              decision (a refusal needs its comment). */}
          {data.stage && data.stage.state !== "in_progress" && (
            <ValidationPanel
              stage={data.stage}
              pendingValidation={pending}
              projectId={projectId}
              mePersonId={mePersonId}
              title={fr.framing.validation.title}
              startLabel={fr.framing.validation.start}
            />
          )}
          <PageSection
            id="framing-open-points"
            title={fr.framing.openPoints.title}
          >
            <OpenPointsSection points={data.openPoints} projectId={projectId} />
          </PageSection>
        </div>
        <PageSection id="framing-tasks" title={fr.framing.tasks.title}>
          <TasksSection
            tasks={data.tasks}
            proposedActions={data.proposedActions}
            members={data.members}
            projectId={projectId}
            mePersonId={mePersonId}
          />
        </PageSection>
      </div>
    </div>
  );
}
