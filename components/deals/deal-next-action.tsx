"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { documentCardClass } from "@/components/ui/document-card-classes";
import { setDealNextAction } from "@/lib/deals/actions";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";

const fr = { deals, dialogs };

/** The next action and follow-up; on a proposal of PO (BIZ 6), the action
 * and day it proposes, saving applies it. */
export function NextActionForm({
  deal,
  proposal,
  onDone,
}: {
  deal: Deal;
  proposal?: { id: string; action: string; on: string | null };
  onDone: () => void;
}) {
  const t = fr.deals.page.next;
  const { pending, error, run } = useWriteSubmit(
    onDone,
    fr.deals.done.nextAction,
  );
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(() =>
          setDealNextAction(
            deal.id,
            {
              nextAction: String(data.get("nextAction") ?? ""),
              nextActionOn: String(data.get("nextActionOn") ?? ""),
              followUpOn: String(data.get("followUpOn") ?? ""),
            },
            proposal?.id,
          ),
        );
      }}
    >
      <Field
        id={`deal-${deal.id}-next`}
        name="nextAction"
        label={t.action}
        maxLength={500}
        defaultValue={proposal?.action ?? deal.nextAction ?? ""}
      />
      <Field
        id={`deal-${deal.id}-next-on`}
        name="nextActionOn"
        type="date"
        label={t.on}
        defaultValue={(proposal ? proposal.on : deal.nextActionOn) ?? ""}
      />
      <Field
        id={`deal-${deal.id}-follow-up`}
        name="followUpOn"
        type="date"
        label={t.followUp}
        hint={t.followUpHint}
        defaultValue={deal.followUpOn ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * A deal's next action and its follow-up date (BIZ 4); whoever writes the
 * deal changes them in a dialog. The next call is not repeated here: it is
 * in « Calls » (Sacha 21/11/2026).
 */
export function DealNextAction({ deal }: { deal: Deal }) {
  const t = fr.deals.page.next;
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* One sentence, not a table (Sacha 20/11/2026): the action and its
          day, then the follow-up. None: the empty note of the deal's other
          sections, its button inside (Sacha 20/11/2026). */}
      {!deal.nextAction && !deal.followUpOn ? (
        <EmptyNote
          action={
            deal.canWrite && (
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                {t.add}
              </Button>
            )
          }
        >
          {t.noneAction}
        </EmptyNote>
      ) : (
        <div
          className={cn(
            documentCardClass,
            "flex-row items-start justify-between gap-4 p-4",
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body-md font-semibold text-pretty">
              {deal.nextAction ?? t.noneAction}
            </p>
            {(deal.nextActionOn || deal.followUpOn) && (
              <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
                {[
                  deal.nextActionOn && formatDay(deal.nextActionOn),
                  deal.followUpOn && t.followUpOn(formatDay(deal.followUpOn)),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          {deal.canWrite && (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              {t.edit}
            </Button>
          )}
        </div>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.editTitle}
        description={t.editDescription}
        closeLabel={fr.dialogs.close}
      >
        {open && <NextActionForm deal={deal} onDone={() => setOpen(false)} />}
      </FormDialog>
    </>
  );
}
