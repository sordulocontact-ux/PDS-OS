"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { Fold } from "@/components/ui/fold";
import { ReasonForm } from "@/components/ui/reason-form";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { withdrawClearance } from "@/lib/legal/clearance/actions";
import { usageOf } from "@/lib/legal/clearance/element";
import { declareNothingToSecure } from "@/lib/legal/clearance/flow-actions";
import type { Clearance } from "@/lib/legal/clearance/types";

const fr = { legalClearance };

/**
 * « Autre issue », folded under the page (Sacha, 07/11/2026: the page must
 * say what to read first): before the request, « Rien à autoriser » with
 * its reason; at any time, the element withdrawn from the title — the
 * borrowing then no longer blocks the release and whoever answers for the
 * project is told (the Master redoes the passage). A refusal is recorded
 * from their answer, in « Négocier les conditions ».
 */
export function OtherWays({
  projectId,
  clearance,
  asking,
}: {
  projectId: string;
  clearance: Clearance;
  // Not asked yet: « Rien à autoriser » is still an answer.
  asking: boolean;
}) {
  const t = fr.legalClearance;
  const decide = t.stages.negotiate.decide;
  const clearanceId = clearance.id;
  return (
    <Fold summary={t.stages.other}>
      <div className="flex flex-wrap gap-2">
        {asking && (
          <DialogButton
            label={t.flow.nothing}
            variant="outline"
            size="sm"
            title={t.flow.nothing}
            description={t.flow.nothingBody}
          >
            {(close) => (
              <ReasonForm
                label={t.flow.reasonLabel}
                submitLabel={t.flow.nothing}
                doneMessage={t.flow.nothingDone}
                run={(reason) =>
                  declareNothingToSecure({
                    projectId,
                    clearanceId,
                    usage: usageOf(clearance),
                    reason,
                  })
                }
                onDone={close}
              />
            )}
          </DialogButton>
        )}
        <DialogButton
          label={t.flow.withdraw}
          variant="outline"
          size="sm"
          title={t.flow.withdraw}
          description={decide.withdrawBody}
        >
          {(close) => (
            <ReasonForm
              label={decide.withdrawWhy}
              submitLabel={t.flow.withdraw}
              doneMessage={decide.withdrawDone}
              run={(text) =>
                withdrawClearance({ projectId, clearanceId, text })
              }
              onDone={close}
            />
          )}
        </DialogButton>
      </div>
    </Fold>
  );
}
