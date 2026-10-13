"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * The confirmation of a validation request (MKT-C2-11), before anything is
 * sent: the object, the version, every section included, who decides and
 * how, a message, the date a decision is expected, and what follows — the
 * version frozen, the validators notified, a changed content to send again.
 */
export function RequestReviewDialog({
  open,
  onOpenChange,
  object,
  version,
  sections,
  validators,
  modeLabel,
  today,
  run,
  done,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // « Direction de la sortie », « Fiche « Clip » ».
  object: string;
  version: number;
  sections: string[];
  validators: string;
  modeLabel: string;
  today: string;
  run: (note: { message: string; dueOn: string }) => Promise<WriteResult>;
  done: string;
}) {
  const t = fr.conceptionRequests;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title(object)}
      description={t.body}
      closeLabel={t.cancel}
    >
      <RequestReviewForm
        object={object}
        version={version}
        sections={sections}
        validators={validators}
        modeLabel={modeLabel}
        today={today}
        run={run}
        done={done}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function RequestReviewForm({
  object,
  version,
  sections,
  validators,
  modeLabel,
  today,
  run,
  done,
  onDone,
}: Omit<Parameters<typeof RequestReviewDialog>[0], "open" | "onOpenChange"> & {
  onDone: () => void;
}) {
  const t = fr.conceptionRequests;
  const [dueError, setDueError] = useState(false);
  const { pending, error, run: submit } = useWriteSubmit(onDone, done);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const dueOn = String(form.get("dueOn") ?? "");
        const bad = dueOn !== "" && dueOn < today;
        setDueError(bad);
        if (bad) return;
        submit(() =>
          run({ message: String(form.get("message") ?? ""), dueOn }),
        );
      }}
    >
      <dl className="grid gap-3 rounded-2xl bg-muted p-4 text-body-md sm:grid-cols-2">
        <div>
          <dt className="text-caption text-muted-foreground">{t.object}</dt>
          <dd className="font-medium">{object}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">{t.version}</dt>
          <dd className="font-medium tabular-nums">
            {t.versionValue(version)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-muted-foreground">{t.scope}</dt>
          <dd>
            <ul className="list-disc pl-5">
              {sections.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-muted-foreground">{t.who}</dt>
          <dd>
            {validators} · {modeLabel}
          </dd>
        </div>
      </dl>
      <TextareaField
        id="request-message"
        name="message"
        label={t.message}
        rows={3}
        maxLength={2000}
        placeholder={t.messagePlaceholder}
      />
      <Field
        id="request-due"
        name="dueOn"
        type="date"
        label={t.due}
        min={today}
        error={dueError ? t.duePast : undefined}
      />
      <p className="text-caption text-muted-foreground">{t.consequences}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.send(validators)}
        onCancel={onDone}
      />
    </form>
  );
}
