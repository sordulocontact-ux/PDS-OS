"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { HolderSelect } from "@/components/production/holder-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { planCallAction } from "@/lib/production/preprod/actions-call-plan";
import type { NetworkOption } from "@/lib/production/sheet";

const fr = { productionPreprod, productionPost };

const t = fr.productionPreprod.call.planAction;

export type PlannedAction = {
  holder: string | null;
  dueDate: string | null;
  task: boolean;
};

/**
 * « Planifier » an action of the call's report (PROD-005): who does it and
 * by when (both required), then it enters the plan approved and, for a
 * member, Travail — the button says it before the click.
 */
export function PlanCallActionButton({
  projectId,
  sheetId,
  itemId,
  proposed,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  itemId: string;
  // A proposal of PO: planning it confirms it.
  proposed: boolean;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const [open, setOpen] = useState(false);
  const [holder, setHolder] = useState("");
  const [missing, setMissing] = useState<Set<"holder" | "due">>(new Set());
  const close = () => setOpen(false);
  const { pending, error, run } = useWriteSubmit(close, t.done);

  function submit(form: HTMLFormElement) {
    const dueDate = String(new FormData(form).get("dueDate") ?? "");
    const lack = new Set<"holder" | "due">();
    if (!holder) lack.add("holder");
    if (!dueDate) lack.add("due");
    setMissing(lack);
    if (lack.size > 0) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    run(() => planCallAction({ projectId, sheetId, itemId, holder, dueDate }));
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {proposed ? t.confirmAndPlan : t.plan}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={fr.productionPost.close}
      >
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit(event.currentTarget);
          }}
        >
          <HolderSelect
            id={`plan-${itemId}-holder`}
            label={t.holder}
            noneLabel={t.holderNone}
            hint={t.holderHint}
            required
            error={missing.has("holder") ? t.missingHolder : undefined}
            value={holder}
            members={members}
            contacts={contacts}
            onChange={setHolder}
          />
          <Field
            id={`plan-${itemId}-due`}
            name="dueDate"
            type="date"
            label={t.due}
            required
            error={missing.has("due") ? t.missingDue : undefined}
          />
          <FormMessage kind="error">{error}</FormMessage>
          <DialogFormActions
            pending={pending}
            submitLabel={t.submit}
            onCancel={close}
          />
        </form>
      </FormDialog>
    </>
  );
}
