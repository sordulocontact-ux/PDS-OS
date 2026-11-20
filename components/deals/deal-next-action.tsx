"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { ViewLink } from "@/components/ui/view-link";
import { setDealNextAction } from "@/lib/deals/actions";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";
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
 * A deal's next action, its follow-up date and its next call (BIZ 4, day
 * and hour: UX test of 12/11/2026), as facts; whoever
 * writes the deal changes them in a dialog.
 */
export function DealNextAction({
  deal,
  nextCall = null,
}: {
  deal: Deal;
  // The next call still to hold: its day and hour, a link to it.
  nextCall?: { label: string; href: string } | null;
}) {
  const t = fr.deals.page.next;
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* One sentence, not a table (Sacha 20/11/2026): the action and its
          day, then the follow-up and the next call. */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-body-md font-medium text-pretty">
            {deal.nextAction ?? t.noneAction}
            {deal.nextActionOn && ` · ${formatDay(deal.nextActionOn)}`}
          </p>
          {(deal.followUpOn || nextCall) && (
            <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
              {deal.followUpOn && t.followUpOn(formatDay(deal.followUpOn))}
              {deal.followUpOn && nextCall && " · "}
              {nextCall && (
                <ViewLink
                  href={nextCall.href}
                  className="underline-offset-2 hover:underline"
                >
                  {t.callOn(nextCall.label)}
                </ViewLink>
              )}
            </p>
          )}
        </div>
        {deal.canWrite && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {t.edit}
          </Button>
        )}
      </div>
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
