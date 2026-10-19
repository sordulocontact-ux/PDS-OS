import { IconLock } from "nucleo-sharp-essential";

import { ContentCard } from "@/components/shell/content-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { WorkflowCard } from "@/lib/overview/cards";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const frame =
  "flex h-full min-w-0 flex-col items-start gap-1.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-4";
const line =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

/**
 * « Les workflows » (proto « Projet complet »): one card per workflow, the
 * whole card opens it — name and status, « Étape n sur N · titre », a green
 * bar of the steps done, then « À vous · action » in blue, « Nom · action »
 * or « Rien en attente ». Everything computed (lib/overview/cards.ts).
 */
export function WorkflowCards({ cards }: { cards: WorkflowCard[] }) {
  const t = fr.projectShell.overview.workflows;
  const statuses = fr.workflowStatus.statuses;
  return (
    <ContentCard title={t.title}>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3">
        {cards.map((card) => {
          const name = fr.shell.project.sidebar[card.workflow];
          if (card.restricted)
            return (
              <li
                key={card.workflow}
                className={cn(frame, "bg-[var(--surface-soft)]")}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <b className="font-semibold">{name}</b>
                  <IconLock
                    aria-hidden
                    className="size-3.5 text-[color:var(--text-tertiary)]"
                  />
                </span>
                <span className={cn(line, "text-[color:var(--text-tertiary)]")}>
                  {t.restricted}
                </span>
              </li>
            );
          return (
            <li key={card.workflow}>
              <ViewLink
                href={card.href}
                className={cn(
                  frame,
                  "text-[color:var(--text-primary)] no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[color:var(--border-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <b className="font-semibold">{name}</b>
                  <StatusBadge tone={workflowStatusTone[card.status]}>
                    {statuses[card.status]}
                  </StatusBadge>
                </span>
                <span className={cn(line, "text-[color:var(--text-tertiary)]")}>
                  {t.stepOf(card.index, card.total, card.stepTitle)}
                </span>
                <ProgressBar
                  value={card.done}
                  max={card.total}
                  label={t.progress(card.done, card.total)}
                  tone="success"
                  size="sm"
                />
                <span
                  className={cn(
                    line,
                    card.next?.mine
                      ? "font-semibold text-[color:var(--selection)]"
                      : "text-[color:var(--text-secondary)]",
                  )}
                >
                  {card.next
                    ? card.next.mine
                      ? t.mine(card.next.todo)
                      : t.other(card.next.who, card.next.todo)
                    : t.nothing}
                </span>
              </ViewLink>
            </li>
          );
        })}
      </ul>
    </ContentCard>
  );
}
