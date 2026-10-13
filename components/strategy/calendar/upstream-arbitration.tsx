"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { LeadDaysForm } from "@/components/strategy/calendar/lead-days-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogButton } from "@/components/ui/dialog-button";
import { formatBriefDate } from "@/lib/framing/assess";
import { written } from "@/lib/framing/written";
import { fr } from "@/lib/i18n/fr";
import { moveMilestone } from "@/lib/strategy/actions/plan";
import { acceptUpstreamRisk } from "@/lib/strategy/actions/upstream";
import {
  firstFeasibleDate,
  type UpstreamChain,
  type UpstreamStepKey,
} from "@/lib/strategy/upstream";

/**
 * Under a chain whose deadline is really past (MKT-S1-04), the three ways
 * out the ticket asks for: move the milestone, shorten the lead times, or
 * accept the risk for this milestone's date (asked again if it moves).
 */
export function UpstreamArbitration({
  projectId,
  chain,
  current,
  today,
  onMoveMilestone,
}: {
  projectId: string;
  chain: UpstreamChain;
  // "YYYY-MM-DD" in Paris: the first feasible date counts from it.
  today: string;
  current: Record<UpstreamStepKey, number | null>;
  onMoveMilestone?: () => void;
}) {
  const t = fr.strategyCalendar.upstream.arbitrate;
  const { pending, run, error, clearError } = useFramingAction({
    inline: true,
  });
  const [confirming, setConfirming] = useState(false);
  const passed = chain.steps.some((s) => s.passed);
  // MKT-S1-10: an option with its impact, not only « Trop tard ».
  const feasible = firstFeasibleDate(chain, today);
  const u = fr.strategyCalendar.upstream;
  if (!passed && !chain.customLeads) return null;

  return (
    <div className="flex flex-col gap-2">
      {feasible && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {u.feasible(formatBriefDate(feasible.date), feasible.shiftDays)}
        </p>
      )}
      {chain.riskAccepted && (
        <p className="text-caption text-muted-foreground">
          {t.accepted(formatBriefDate(chain.milestoneDate))}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {feasible && (
          <ConfirmButton
            label={u.moveTo(formatBriefDate(feasible.date))}
            size="xs"
            title={u.moveTitle}
            body={u.moveBody(
              chain.milestoneTitle,
              formatBriefDate(chain.milestoneDate),
              formatBriefDate(feasible.date),
            )}
            confirmLabel={u.moveTo(formatBriefDate(feasible.date))}
            pendingLabel={fr.dialogs.saving}
            done={u.moved}
            run={async () => {
              const result = await moveMilestone(
                projectId,
                chain.milestoneId,
                feasible.date,
              );
              return written(result);
            }}
          />
        )}
        {passed && onMoveMilestone && (
          <Button size="xs" variant="outline" onClick={onMoveMilestone}>
            {t.move}
          </Button>
        )}
        <DialogButton
          label={t.leads}
          size="xs"
          title={t.leadsTitle(chain.deliverableTitle)}
          description={t.leadsBody}
        >
          {(close) => (
            <LeadDaysForm
              projectId={projectId}
              deliverableId={chain.deliverableId}
              current={current}
              onDone={close}
            />
          )}
        </DialogButton>
        {passed &&
          (chain.riskAccepted ? (
            <Button
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                run(() =>
                  acceptUpstreamRisk(projectId, chain.deliverableId, null),
                )
              }
            >
              {t.withdraw}
            </Button>
          ) : (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirming(true)}
            >
              {t.accept}
            </Button>
          ))}
      </div>
      {error && !confirming && <FormMessage kind="error">{error}</FormMessage>}
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          clearError();
          setConfirming(open);
        }}
        title={t.acceptTitle}
        description={t.acceptBody(
          chain.deliverableTitle,
          chain.milestoneTitle,
          formatBriefDate(chain.milestoneDate),
        )}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.accept}
        pendingLabel={t.accepting}
        pending={pending}
        error={error}
        onConfirm={() =>
          run(
            () =>
              acceptUpstreamRisk(
                projectId,
                chain.deliverableId,
                chain.milestoneDate,
              ),
            () => setConfirming(false),
          )
        }
      />
    </div>
  );
}
