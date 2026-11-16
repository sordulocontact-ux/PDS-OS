import { Rows } from "@/components/ui/rows";
import { StepSection } from "@/components/shell/journey/step-section";
import { EmptyNote } from "@/components/shell/empty-state";
import type { Member } from "@/lib/framing/related";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import type { FollowUp } from "@/lib/production/shoot/follow-ups";

import { FollowUpTaskButton } from "./follow-up-task-button";

const fr = { productionShoot };

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
    <StepSection title={t.title} description={t.description}>
      {followUps.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <Rows>
          {followUps.map((f) => (
            <li
              key={f.key}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 modern:py-4"
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
        </Rows>
      )}
    </StepSection>
  );
}
