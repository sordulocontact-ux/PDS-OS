import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Member } from "@/lib/framing/related";
import { productionChecklist } from "@/lib/i18n/fr/production-checklist";
import {
  isChecklistAction,
  type PlanAction,
} from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";
import { formatShortDay } from "@/lib/utils/day";

import { AddTaskForm } from "./add-task-form";
import { FinishTaskButton } from "./finish-task-button";

const fr = { productionChecklist };

const t = fr.productionChecklist;

const originOf = (origin: string | null) =>
  origin === "checklist" || origin === null ? t.origins.checklist : origin;

/**
 * « Checklist de préproduction » (proto BODY.prep): the company's tasks,
 * seeded with the quote's validation, and the ones PDS added — what, who,
 * for when, where it comes from, done or not (« À revoir » after a change
 * elsewhere); « Fait » for its holder in PDS, « Ajouter une tâche » for
 * whoever organises.
 */
export function ChecklistSection({
  projectId,
  sheetId,
  actions,
  company,
  canOrganize,
  mePersonId,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  actions: PlanAction[];
  company: string | null;
  canOrganize: boolean;
  mePersonId: string | null;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const list = actions.filter(
    (a) => isChecklistAction(a) && a.status === "approved",
  );
  const done = (a: PlanAction) => a.doneAt !== null || a.taskDone === true;
  return (
    <section aria-labelledby="checklist-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="checklist-title" className="font-semibold">
          {t.title}
        </h3>
        {list.length > 0 && (
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {t.count(list.filter(done).length, list.length)}
          </span>
        )}
      </div>
      <p className="text-[color:var(--text-secondary)]">
        {company ? t.intro(company) : t.introInternal}
      </p>
      {list.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card">
          {list.map((a) => {
            const isDone = done(a);
            const mine =
              a.holder?.kind === "person" &&
              (a.holder.id === mePersonId || canOrganize);
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3 last:border-b-0"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
                  <span
                    className={
                      isDone ? "text-[color:var(--text-secondary)]" : undefined
                    }
                  >
                    {a.title}
                  </span>
                  <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                    {[
                      a.holder?.name,
                      a.dueDate
                        ? t.due(formatShortDay(a.dueDate, { bare: true }))
                        : null,
                      t.origin(originOf(a.origin)),
                      a.doneAt ? t.doneOn(formatShortDay(a.doneAt)) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    size="sm"
                    tone={isDone ? "success" : a.review ? "warning" : "neutral"}
                  >
                    {isDone
                      ? t.state.done
                      : a.review
                        ? t.state.review
                        : t.state.todo}
                  </StatusBadge>
                  {!isDone && mine && (
                    <FinishTaskButton
                      projectId={projectId}
                      actionId={a.id}
                      title={a.title}
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {canOrganize && list.length > 0 && (
        <AddTaskForm
          projectId={projectId}
          sheetId={sheetId}
          members={members}
          contacts={contacts}
        />
      )}
    </section>
  );
}
