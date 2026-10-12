"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { LeadDaysForm } from "@/components/strategy/calendar/lead-days-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogButton } from "@/components/ui/dialog-button";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { acceptUpstreamRisk } from "@/lib/strategy/actions/upstream";
import type { UpstreamChain, UpstreamStepKey } from "@/lib/strategy/upstream";

/**
 * Under a chain whose deadline is really past (MKT-S1-04), the three ways
 * out the ticket asks for: move the milestone, shorten the lead times, or
 * accept the risk for this milestone's date (asked again if it moves).
 */
export function UpstreamArbitration({
  projectId,
  chain,
  current,
  onMoveMilestone,
}: {
  projectId: string;
  chain: UpstreamChain;
  current: Record<UpstreamStepKey, number | null>;
  onMoveMilestone?: () => void;
}) {
  const t = fr.strategyCalendar.upstream.arbitrate;
  const { pending, run, error, clearError } = useFramingAction({
    inline: true,
  });
  const [confirming, setConfirming] = useState(false);
  const passed = chain.steps.some((s) => s.passed);
  if (!passed && !chain.customLeads) return null;

  return (
    <div className="flex flex-col gap-2">
      {chain.riskAccepted && (
        <p className="text-caption text-muted-foreground">
          {t.accepted(formatBriefDate(chain.milestoneDate))}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
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
