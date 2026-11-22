"use client";

import { FormMessage } from "@/components/auth/form-message";
import { nowHeading } from "@/components/deals/now-classes";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { createDealMemo, validateDealMemo } from "@/lib/deals/memo-actions";
import { submitDealMemo } from "@/lib/deals/memo-mail-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos;

/** The latest memo, as far as the negotiation's gesture needs it. */
export type MemoStep = {
  memo: { id: string; open: boolean } | null;
  // Changes were asked on the latest: its next version is awaited.
  changesAsked: boolean;
  address: string | null;
  // The label or the brand that sends it; none for a music deal, where PDS
  // writes it.
  counterpart: string | null;
  director: boolean;
};

/**
 * The negotiation's gesture in « Maintenant » (Sacha 22/11/2026, réunion
 * avec Ibé du 18/11/2026: the deal memo is the accord de principe). A memo
 * there, not shown yet: « Montrer à la direction » (the deal goes to its
 * accord, 20261122110101), or « Valider » for the direction. None yet: a
 * label or a brand sends it — its address to copy for them, « Rédiger le
 * deal memo » beside in case —; a music deal, PDS writes it from the terms.
 */
export function DealMemoNow({
  dealId,
  step,
}: {
  dealId: string;
  step: MemoStep;
}) {
  const write = useWriteSubmit(undefined, t.created);
  const go = useWriteSubmit(undefined, t.submitted);
  const memo = step.memo?.open ? step.memo : null;
  const writeButton = (variant: "default" | "outline") => (
    <Button
      variant={variant}
      disabled={write.pending}
      aria-busy={write.pending || undefined}
      onClick={() => write.run(() => createDealMemo(dealId))}
    >
      {t.now.write}
    </Button>
  );
  const heading = memo
    ? step.director
      ? t.now.validate
      : t.now.show
    : step.counterpart
      ? (step.changesAsked ? t.now.waitingAgain : t.now.waiting)(
          step.counterpart,
        )
      : t.now.write;
  const error = write.error ?? go.error;
  return (
    <>
      <h2 className={nowHeading}>{heading}</h2>
      <div className="flex flex-wrap gap-2">
        {memo ? (
          <Button
            disabled={go.pending}
            aria-busy={go.pending || undefined}
            onClick={() =>
              go.run(
                () =>
                  step.director
                    ? validateDealMemo(dealId, memo.id)
                    : submitDealMemo(dealId, memo.id),
                step.director ? t.validated : t.submitted,
              )
            }
          >
            {step.director ? t.now.validateButton : t.submit}
          </Button>
        ) : step.counterpart ? (
          <>
            {step.address && (
              <CopyButton
                value={step.address}
                label={t.now.copyAddress}
                copiedLabel={t.address.copied}
                variant="default"
                size="default"
              />
            )}
            {writeButton("outline")}
          </>
        ) : (
          writeButton("default")
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </>
  );
}
