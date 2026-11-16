"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { addReminder, removeReminder } from "@/lib/finance/invoice-actions";
import {
  isReminderChannel,
  REMINDER_CHANNELS,
  type Income,
  type ReminderChannel,
} from "@/lib/finance/money-in";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { treasury } from "@/lib/i18n/fr/treasury";
import { todayInParis } from "@/lib/insights/dates";
import { formatShortDay } from "@/lib/utils/day";

const fr = { clientInvoices, treasury };

const day = (value: string) => formatShortDay(value, { bare: true });

/**
 * « Noter une relance »: the reminder someone made (when, how, what was
 * said) and what comes next, the next action kept on the invoice. The
 * reminders made before are listed first, each removable when entered by
 * mistake. Nothing is sent to the client from here.
 */
export function ReminderForm({
  income,
  onDone,
}: {
  income: Income;
  onDone: () => void;
}) {
  const t = fr.clientInvoices.reminderForm;
  const root = useRef<HTMLFormElement>(null);
  const submit = useWriteSubmit(onDone, "");
  const [remindedOn, setRemindedOn] = useState(todayInParis());
  const [channel, setChannel] = useState<ReminderChannel>("email");
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState(income.nextAction ?? "");
  const [nextActionOn, setNextActionOn] = useState(income.nextActionOn ?? "");
  const [tried, setTried] = useState(false);
  const error = remindedOn ? undefined : t.errors.remindedOn;

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (error) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    submit.run(() =>
      addReminder({
        incomeId: income.id,
        remindedOn,
        channel,
        note,
        nextAction,
        nextActionOn,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {income.reminders.length > 0 && (
        <section
          aria-labelledby="reminders-earlier"
          className="flex flex-col gap-2"
        >
          <h3
            id="reminders-earlier"
            className="text-caption text-[color:var(--text-secondary)]"
          >
            {t.earlier}
          </h3>
          <ul className="flex flex-col gap-2">
            {income.reminders.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 text-body-md"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span>
                    {[
                      day(r.remindedOn),
                      fr.clientInvoices.channels[r.channel],
                      r.by,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {r.note && (
                    <span className="text-caption break-words text-[color:var(--text-secondary)]">
                      {r.note}
                    </span>
                  )}
                </span>
                <ConfirmButton
                  label={t.remove}
                  size="xs"
                  title={t.removeTitle}
                  body={t.removeBody}
                  confirmLabel={t.remove}
                  pendingLabel={t.removing}
                  done={fr.clientInvoices.done.reminderRemoved}
                  run={() => removeReminder(r.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <form
        ref={root}
        noValidate
        onSubmit={send}
        className="flex flex-col gap-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="reminder-on"
            type="date"
            label={t.remindedOn}
            required
            value={remindedOn}
            error={tried ? error : undefined}
            onChange={(e) => setRemindedOn(e.target.value)}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="reminder-channel">{t.channel}</Label>
            <SearchSelect
              id="reminder-channel"
              label={t.channel}
              options={Object.fromEntries(
                REMINDER_CHANNELS.map((c) => [
                  c,
                  fr.clientInvoices.channels[c],
                ]),
              )}
              value={channel}
              onChange={(v) => isReminderChannel(v) && setChannel(v)}
              searchPlaceholder={fr.treasury.incomeForm.search}
              emptyLabel={fr.treasury.incomeForm.noMatch}
              fill
            />
          </div>
        </div>
        <Field
          name="reminder-note"
          label={t.note}
          maxLength={500}
          autoComplete="off"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <FormSection title={t.nextTitle}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              name="reminder-next"
              label={t.nextAction}
              maxLength={300}
              autoComplete="off"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
            <Field
              name="reminder-next-on"
              type="date"
              label={t.nextActionOn}
              value={nextActionOn}
              onChange={(e) => setNextActionOn(e.target.value)}
            />
          </div>
        </FormSection>
        {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
        <DialogFormActions
          pending={submit.pending}
          submitLabel={t.save}
          pendingLabel={t.saving}
          onCancel={onDone}
        />
      </form>
    </div>
  );
}
