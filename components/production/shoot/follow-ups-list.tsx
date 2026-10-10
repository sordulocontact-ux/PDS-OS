import { EmptyNote } from "@/components/shell/empty-state";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { FollowUp } from "@/lib/production/shoot/follow-ups";

import { FollowUpTaskButton } from "./follow-up-task-button";

const t = fr.productionShoot.followUps;

/** The follow-ups PO proposes (decided by code), each turned into a task
 * only once the owner chose who and when. */
export function FollowUpsList({
  projectId,
  followUps,
  members,
  canOrganize,
}: {
  projectId: string;
  followUps: FollowUp[];
  members: Member[];
  canOrganize: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      {followUps.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {followUps.map((f) => (
            <li
              key={f.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium break-words">
                  {f.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {f.reason}
                </span>
              </div>
              {canOrganize && (
                <FollowUpTaskButton
                  projectId={projectId}
                  followUp={f}
                  members={members}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
