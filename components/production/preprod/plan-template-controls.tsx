"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import {
  applyPlanReschedule,
  proposePlanActions,
} from "@/lib/production/preprod/actions-plan-template";
import type { Reschedule } from "@/lib/production/preprod/plan-template";
import { formatShortDate } from "@/lib/release/format";

const t = fr.productionPreprod.plan.template;

/**
 * « Proposer un plan » (PROD-006): the usual steps of a shoot not in the
 * plan yet, as drafts — then « Recalculer les échéances » (PROD-010), the
 * changes shown before anything moves.
 */
export function PlanTemplateControls({
  projectId,
  deliverableId,
  missing,
  hasPlan,
  reschedule,
}: {
  projectId: string;
  deliverableId: string;
  // Proposed steps not in the plan yet.
  missing: number;
  hasPlan: boolean;
  reschedule: Reschedule[];
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const apply = useWriteSubmit(() => setOpen(false), t.rescheduled);

  const propose = () =>
    startTransition(async () => {
      const result = await proposePlanActions({ projectId, deliverableId });
      if (!result.ok) return void toast.error(result.error);
      toast.success(t.proposed(result.count ?? missing));
    });

  return (
    <>
      {missing > 0 && (
        <Button
          size="sm"
          variant={hasPlan ? "outline" : "default"}
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={propose}
          title={t.proposeHint}
        >
          {hasPlan ? t.proposeMore(missing) : t.propose}
        </Button>
      )}
      {reschedule.length > 0 && (
        <>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {t.reschedule(reschedule.length)}
          </Button>
          <FormDialog
            open={open}
            onOpenChange={setOpen}
            title={t.rescheduleTitle}
            description={t.rescheduleDescription}
            closeLabel={fr.productionPost.close}
          >
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                apply.run(() =>
                  applyPlanReschedule({ projectId, deliverableId }),
                );
              }}
            >
              <ul className="flex flex-col gap-2 text-sm">
                {reschedule.map((r) => (
                  <li
                    key={r.actionId}
                    className="flex flex-wrap justify-between gap-x-4 gap-y-1"
                  >
                    <span className="min-w-0 font-medium break-words">
                      {r.title}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {r.from ? formatShortDate(r.from) : t.none} →{" "}
                      <span className="text-foreground">
                        {formatShortDate(r.to)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <FormMessage kind="error">{apply.error}</FormMessage>
              <DialogFormActions
                pending={apply.pending}
                submitLabel={t.rescheduleConfirm}
                onCancel={() => setOpen(false)}
              />
            </form>
          </FormDialog>
        </>
      )}
    </>
  );
}
