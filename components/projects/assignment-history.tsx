import { ClarificationList } from "@/components/projects/clarification-list";
import { formatDay } from "@/lib/assistant/facts";
import { transmission } from "@/lib/i18n/fr/transmission";
import { clarificationsOf } from "@/lib/projects/clarifications";
import type { Assignment } from "@/lib/projects/types";

const fr = { transmission };

// Every transmission of a project, newest first: who, to whom, when, the
// director's message and the answer.
export function AssignmentHistory({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const t = fr.transmission.history;
  if (assignments.length === 0) return null;

  return (
    <>
      <ClarificationList items={clarificationsOf(assignments)} />
      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="text-base font-medium">
          {t.title}
        </h2>
        <ol className="divide-y divide-border rounded-xl border border-border">
          {assignments.map((a) => (
            <li key={a.id} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {t.transmitted(a.assignedByName, a.assigneeName)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDay(a.createdAt)}
                </span>
              </div>
              {a.note && (
                <p className="whitespace-pre-line text-muted-foreground">
                  {a.note}
                </p>
              )}
              <p>
                <span className="font-medium">{t.decisions[a.status]}</span>
                {a.respondedAt && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {formatDay(a.respondedAt)}
                  </span>
                )}
              </p>
              {a.response && (
                <p className="border-l-2 border-border pl-3 whitespace-pre-line">
                  {a.response}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
