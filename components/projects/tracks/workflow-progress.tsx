import { ProgressRing } from "@/components/ui/progress-ring";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { titleTracks } from "@/lib/i18n/fr/title-tracks";
import type { WorkflowCard } from "@/lib/overview/cards";
import { cn } from "@/lib/utils";

const fr = { projectShell, titleTracks };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

type OpenCard = Extract<WorkflowCard, { restricted: false }>;

// The ring of a workflow's steps done; its label says the figures.
function Ring({ card }: { card: OpenCard }) {
  const done = card.status === "not_started" ? 0 : card.done;
  return (
    <ProgressRing
      value={done}
      max={card.total}
      label={fr.projectShell.overview.progress.steps(done, card.total)}
    />
  );
}

/**
 * One workflow of a title in « Titres » (Maël 25/11/2026: two lines at
 * most, no more detail than needed): its ring, the step it is at
 * (« Terminé » once done), and « À vous » under it when the next action is
 * the viewer's. The figures are the ring's; the action itself is on the
 * title's page. Nothing when the workflow is closed to the viewer.
 */
export function WorkflowProgress({ card }: { card: WorkflowCard | undefined }) {
  if (!card || card.restricted) return null;
  const mine = Boolean(card.next?.mine);
  const step =
    card.status === "done"
      ? fr.projectShell.overview.progress.done
      : card.stepTitle;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Ring card={card} />
      {/* The column's 192 px less the ring: a longer step wraps once, or is
          cut when « À vous » takes the second line. */}
      <span className="flex max-w-32 min-w-0 flex-col">
        <span
          title={step}
          className={cn(
            "font-normal text-[color:var(--text-secondary)]",
            mine ? "truncate" : "line-clamp-2 whitespace-normal",
          )}
        >
          {step}
        </span>
        {mine && (
          <span className={cn(caption, "text-[color:var(--selection)]")}>
            {fr.titleTracks.list.mine}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * The same, on one line under the title's name on a narrow screen: the
 * ring and the workflow's name, in the selection colour when the next
 * action is the viewer's.
 */
export function WorkflowRing({
  card,
  label,
}: {
  card: WorkflowCard | undefined;
  label: string;
}) {
  if (!card || card.restricted) return null;
  const mine = Boolean(card.next?.mine);
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <Ring card={card} />
      <span className={cn(mine && "text-[color:var(--selection)]")}>
        {label}
        {mine && (
          <span className="sr-only">
            {" · "}
            {fr.titleTracks.list.mine}
          </span>
        )}
      </span>
    </span>
  );
}
