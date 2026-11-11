"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { assignDeal } from "@/lib/deals/actions";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

function AssignForm({
  dealId,
  current,
  negotiators,
  onDone,
}: {
  dealId: string;
  current: string | null;
  negotiators: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.deals.page.info;
  const { pending, error, run } = useWriteSubmit(onDone, "");
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const who = String(new FormData(event.currentTarget).get("assignee"));
        run(() => assignDeal(dealId, who || null));
      }}
    >
      <OptionSelect
        id={`deal-${dealId}-assignee`}
        name="assignee"
        label={t.assignee}
        required
        items={negotiators}
        defaultValue={current}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.assignSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Changer » who negotiates a deal: the direction, the project's owner
 * (BIZ 4), among the members who negotiate. */
export function AssignDealButton(props: {
  dealId: string;
  current: string | null;
  negotiators: Record<string, string>;
}) {
  const t = fr.deals.page.info;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t.change}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.assignTitle}
        description={t.assignDescription}
        closeLabel={fr.dialogs.close}
      >
        {open && <AssignForm {...props} onDone={() => setOpen(false)} />}
      </FormDialog>
    </>
  );
}
