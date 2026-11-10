import { IconCheck, IconChevronRight, IconLock } from "nucleo-sharp-essential";

import { ContentCard } from "@/components/shell/content-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ViewLink } from "@/components/ui/view-link";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { shell } from "@/lib/i18n/fr/shell";
import type { WorkflowCard } from "@/lib/overview/cards";
import { isLocked, type JourneyStep } from "@/lib/ui/journey";
import { cn } from "@/lib/utils";

const fr = { projectShell, shell };

const caption =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
const row =
  "rounded-lg no-underline outline-offset-2 focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring)]";

type State = "done" | "current" | "later";

const stateOf = (step: JourneyStep): State =>
  step.status === "done" || step.status === "obsolete"
    ? "done"
    : isLocked(step.status)
      ? "later"
      : "current";

/**
 * « Progression » of the overview (retour d'Akili du 05/11/2026, proto
 * validated 10/11): one title, no state pills. Before « Lancer le plan »,
 * the Cadrage's steps on a thread — a check when done, the open one in the
 * selection colour with who acts (« À vous » or a name), the next ones
 * hollow; after, one line per workflow: a ring of its steps done, « Étape n
 * sur N · titre » or « À vous : … ». Each line opens its step or workflow.
 */
export function OverviewProgress(
  props:
    | { framing: JourneyStep[]; workflows?: never }
    | { workflows: WorkflowCard[]; framing?: never },
) {
  const t = fr.projectShell.overview.progress;
  if (props.workflows)
    return (
      <ContentCard title={t.title} quietTitle className="p-6">
        <WorkflowRows cards={props.workflows} />
      </ContentCard>
    );
  const steps = props.framing;
  return (
    <ContentCard title={t.framing} quietTitle className="p-6">
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const state = stateOf(step);
          const actor = state === "current" ? step.actor : null;
          return (
            <li
              key={step.key}
              className="relative grid grid-cols-[1.375rem_minmax(0,1fr)] gap-3.5 pb-4 last:pb-0"
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-6 bottom-0.5 left-2.5 w-0.5 rounded-full",
                    state === "done"
                      ? "bg-[var(--text-primary)]"
                      : "bg-[var(--border-hairline)]",
                  )}
                />
              )}
              <StepMark state={state} />
              <ViewLink href={step.href} className={cn(row, "min-w-0")}>
                <span
                  className={cn(
                    "block text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)]",
                    state === "current" &&
                      "font-semibold text-[color:var(--selection)]",
                    state === "done" && "text-[color:var(--text-primary)]",
                    state === "later" && "text-[color:var(--text-secondary)]",
                  )}
                >
                  {step.title}
                  <span className="sr-only"> ({t.state[state]})</span>
                </span>
                {actor && (
                  <span
                    className={cn(
                      caption,
                      actor.viewer && "text-[color:var(--selection)]",
                    )}
                  >
                    {actor.viewer ? t.mine : actor.name}
                  </span>
                )}
              </ViewLink>
            </li>
          );
        })}
      </ol>
    </ContentCard>
  );
}

function StepMark({ state }: { state: State }) {
  if (state === "done")
    return (
      <span
        aria-hidden
        className="mt-px grid size-[1.375rem] place-items-center rounded-full bg-[var(--text-primary)] text-[color:var(--surface-page)]"
      >
        <IconCheck className="size-3" />
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn(
        "mt-px grid size-[1.375rem] place-items-center rounded-full border",
        state === "current"
          ? "border-2 border-[color:var(--selection)]"
          : "border-[color:var(--border-default)]",
      )}
    >
      {state === "current" && (
        <span className="size-2 rounded-full bg-[var(--selection)]" />
      )}
    </span>
  );
}

function WorkflowRows({ cards }: { cards: WorkflowCard[] }) {
  const t = fr.projectShell.overview.progress;
  const line =
    "grid grid-cols-[1.5rem_minmax(0,1fr)_1rem] items-center gap-3.5 px-2 py-2.5";
  return (
    <ul className="-mx-2 flex flex-col gap-1">
      {cards.map((card) => {
        const name = fr.shell.project.sidebar[card.workflow];
        if (card.restricted)
          return (
            <li key={card.workflow} className={line}>
              <IconLock
                aria-hidden
                className="mx-auto size-4 text-[color:var(--text-tertiary)]"
              />
              <span>
                <span className="block">{name}</span>
                <span className={caption}>{t.restricted}</span>
              </span>
            </li>
          );
        const mine = card.next?.mine ? card.next.todo : null;
        return (
          <li key={card.workflow}>
            <ViewLink
              href={card.href}
              className={cn(
                row,
                line,
                "text-[color:var(--text-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-hover)]",
              )}
            >
              <ProgressRing
                value={card.done}
                max={card.total}
                label={t.steps(card.done, card.total)}
              />
              <span className="min-w-0">
                <span className="block">{name}</span>
                <span
                  className={cn(
                    caption,
                    mine && "text-[color:var(--selection)]",
                  )}
                >
                  {mine
                    ? t.mineTodo(mine)
                    : card.status === "done"
                      ? t.done
                      : t.stepOf(card.index, card.total, card.stepTitle)}
                </span>
              </span>
              <IconChevronRight
                aria-hidden
                className="size-4 text-[color:var(--text-tertiary)]"
              />
            </ViewLink>
          </li>
        );
      })}
    </ul>
  );
}
