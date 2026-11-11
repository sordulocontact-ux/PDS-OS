"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { DealStageForm } from "@/components/deals/deal-stage-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  abandonDeal,
  decideDealAgreement,
  setDealStage,
} from "@/lib/deals/actions";
import type { Deal, DealStage } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

type Open = "refuse" | "stage" | "abandon" | null;

/**
 * The gestures of a deal's « Maintenant » (BIZ 4): the direction validates
 * the accord de principe or sends it back with a reason; the negotiator
 * moves to the next stage (main button), to another (outline), or abandons
 * the deal with a reason (text button beside the outline).
 */
export function DealNowActions({
  deal,
  mode,
  next,
}: {
  deal: Deal;
  mode: "decide" | "move" | "wait";
  next: DealStage | null;
}) {
  const t = fr.deals.page;
  const [open, setOpen] = useState<Open>(null);
  const { pending, error, run } = useWriteSubmit(undefined, "");
  const close = () => setOpen(null);

  const dialog = (
    <>
      <FormDialog
        open={open === "refuse"}
        onOpenChange={(o) => !o && close()}
        title={t.refuse}
        description={t.decideWhy(deal.assignee?.name ?? t.someone)}
        closeLabel={fr.dialogs.close}
      >
        <ReasonForm
          label={t.refuseReason}
          submitLabel={t.refuse}
          doneMessage={fr.deals.done.agreementRefused}
          run={(reason) => decideDealAgreement(deal.id, false, reason)}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={open === "abandon"}
        onOpenChange={(o) => !o && close()}
        title={t.abandonTitle}
        description={t.abandonDescription}
        closeLabel={fr.dialogs.close}
      >
        <ReasonForm
          label={t.abandonReason}
          submitLabel={t.abandonSubmit}
          doneMessage={fr.deals.done.abandoned}
          run={(reason) => abandonDeal(deal.id, reason)}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={open === "stage"}
        onOpenChange={(o) => !o && close()}
        title={t.otherStageTitle}
        description={t.otherStageDescription}
        closeLabel={fr.dialogs.close}
      >
        {open === "stage" && <DealStageForm deal={deal} onDone={close} />}
      </FormDialog>
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {mode === "decide" ? (
          <>
            <Button
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => run(() => decideDealAgreement(deal.id, true))}
            >
              {t.approve}
            </Button>
            <Button variant="outline" onClick={() => setOpen("refuse")}>
              {t.refuse}
            </Button>
          </>
        ) : (
          <>
            {mode === "move" && next && (
              <Button
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={() => run(() => setDealStage(deal.id, next))}
              >
                {t.advance[next]}
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen("stage")}>
              {t.otherStage}
            </Button>
            <Button variant="ghost" onClick={() => setOpen("abandon")}>
              {t.abandon}
            </Button>
          </>
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {dialog}
    </div>
  );
}
