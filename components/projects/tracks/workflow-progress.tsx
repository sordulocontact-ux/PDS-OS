import { ProgressRing } from "@/components/ui/progress-ring";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import type { WorkflowCard } from "@/lib/overview/cards";
import { cn } from "@/lib/utils";

const fr = { projectShell };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";

/** Where a title stands in one workflow, in words: « À vous : … »,
 * « Terminé », else « Étape n sur N · titre » — the words of a project's
 * « Progression », word for word (the title's page shows the same). */
export function workflowProgressText(
  card: Extract<WorkflowCard, { restricted: false }>,
): { text: string; mine: boolean } {
  const t = fr.projectShell.overview.progress;
  if (card.next?.mine) return { text: t.mineTodo(card.next.todo), mine: true };
  if (card.status === "done") return { text: t.done, mine: false };
  return {
    text: t.stepOf(card.index, card.total, card.stepTitle),
    mine: false,
  };
}

/**
 * One workflow of a title in the list « Titres » (Maël 25/11/2026): the
 * ring of its steps done, then where it stands, as the overview's
 * « Progression » says it. Nothing when the workflow is closed to the
 * viewer (the column is not shown then).
 */
export function WorkflowProgress({
  card,
  className,
}: {
  card: WorkflowCard | undefined;
  className?: string;
}) {
  if (!card || card.restricted) return null;
  const { text, mine } = workflowProgressText(card);
  const started = card.status !== "not_started";
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <ProgressRing
        value={started ? card.done : 0}
        max={card.total}
        label={fr.projectShell.overview.progress.steps(
          started ? card.done : 0,
          card.total,
        )}
      />
      <span
        className={cn(
          caption,
          "min-w-0 whitespace-normal",
          mine && "text-[color:var(--selection)]",
          !mine && started && "text-[color:var(--text-secondary)]",
        )}
      >
        {text}
      </span>
    </span>
  );
}
