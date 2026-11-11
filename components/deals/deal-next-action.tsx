"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { setDealNextAction } from "@/lib/deals/actions";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { formatDay } from "@/lib/utils/day";

const fr = { deals, dialogs };

function NextActionForm({ deal, onDone }: { deal: Deal; onDone: () => void }) {
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
          setDealNextAction(deal.id, {
            nextAction: String(data.get("nextAction") ?? ""),
            nextActionOn: String(data.get("nextActionOn") ?? ""),
            followUpOn: String(data.get("followUpOn") ?? ""),
          }),
        );
      }}
    >
      <Field
        id={`deal-${deal.id}-next`}
        name="nextAction"
        label={t.action}
        maxLength={500}
        defaultValue={deal.nextAction ?? ""}
      />
      <Field
        id={`deal-${deal.id}-next-on`}
        name="nextActionOn"
        type="date"
        label={t.on}
        defaultValue={deal.nextActionOn ?? ""}
      />
      <Field
        id={`deal-${deal.id}-follow-up`}
        name="followUpOn"
        type="date"
        label={t.followUp}
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
 * A deal's next action and its follow-up date (BIZ 4), as facts; whoever
 * writes the deal changes them in a dialog.
 */
export function DealNextAction({ deal }: { deal: Deal }) {
  const t = fr.deals.page.next;
  const [open, setOpen] = useState(false);
  return (
    <>
      <FactRows>
        <FactRow
          label={t.action}
          value={deal.nextAction ?? t.none}
          source={deal.nextActionOn ? formatDay(deal.nextActionOn) : null}
          side={
            deal.canWrite ? (
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                {t.edit}
              </Button>
            ) : null
          }
        />
        <FactRow
          label={t.followUp}
          value={deal.followUpOn ? formatDay(deal.followUpOn) : t.none}
        />
      </FactRows>
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
