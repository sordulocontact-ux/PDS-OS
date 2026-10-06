"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { CallFields, withOccurredAt } from "@/components/calls/call-fields";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { idleFormState } from "@/lib/auth/form-state";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { fr } from "@/lib/i18n/fr";
import { prepareMasterExchange } from "@/lib/master-workflow/exchange-actions";

/**
 * "Préparer un échange": the call's title, date and link in the modal, with
 * the agenda the code built from what the brief lacks. Created, the call
 * opens (recording, processing), like any call of the project.
 */
export function PrepareExchangeButton({
  projectId,
  agenda,
  defaultOccurredAt,
}: {
  projectId: string;
  agenda: AgendaItem[];
  defaultOccurredAt: string;
}) {
  const t = fr.masterWorkflow.brief.exchanges;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.prepare}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.prepareTitle}
        description={t.prepareDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <ExchangeForm
          projectId={projectId}
          agenda={agenda}
          defaultOccurredAt={defaultOccurredAt}
          onCancel={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function ExchangeForm({
  projectId,
  agenda,
  defaultOccurredAt,
  onCancel,
}: {
  projectId: string;
  agenda: AgendaItem[];
  defaultOccurredAt: string;
  onCancel: () => void;
}) {
  const t = fr.masterWorkflow.brief.exchanges;
  const [state, formAction] = useActionState(
    prepareMasterExchange,
    idleFormState,
  );
  // Its total is the sum of its points (code), as on the call's page.
  const minutes = agenda.reduce((sum, item) => sum + item.minutes, 0);
  return (
    <form
      action={(form) => formAction(withOccurredAt(form))}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <CallFields
        idPrefix="exchange"
        defaultTitle={t.defaultTitle}
        defaultOccurredAt={defaultOccurredAt}
      />
      <section aria-labelledby="exchange-agenda" className="grid gap-2">
        <h3 id="exchange-agenda" className="text-sm font-medium">
          {t.agendaTitle(minutes)}
        </h3>
        <ol className="grid list-decimal gap-1 pl-5 text-sm">
          {agenda.map((item) => (
            <li key={item.topic}>
              {item.topic}{" "}
              <span className="text-[color:var(--text-secondary)] tabular-nums">
                · {t.minutes(item.minutes)}
              </span>
            </li>
          ))}
        </ol>
      </section>
      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.masterPage.form.cancel}
        </Button>
        <SubmitButton pendingLabel={t.preparing}>{t.create}</SubmitButton>
      </div>
    </form>
  );
}
