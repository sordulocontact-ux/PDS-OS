"use client";

import { useState, type ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decideDealAgreement, setDealStage } from "@/lib/deals/actions";
import type { Deal, DealStage } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

type Open = "refuse" | null;

/**
 * The gestures of a deal's « Maintenant » (BIZ 4): the direction validates
 * the accord de principe or sends it back with a reason; the negotiator
 * moves to the next stage or does the stage's own gesture (`lead`: « Caler
 * le call »). « Changer d'étape » and « Abandonner » are in the « ⋯ »
 * beside the deal's title (DealStageMenu, Sacha 22/11/2026).
 */
export function DealNowActions({
  deal,
  mode,
  next,
  lead,
}: {
  deal: Deal;
  mode: "decide" | "move";
  next: DealStage | null;
  lead?: ReactNode;
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
            {mode === "move" && !next && lead}
          </>
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {dialog}
    </div>
  );
}
