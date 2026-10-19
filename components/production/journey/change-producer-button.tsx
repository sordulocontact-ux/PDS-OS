"use client";

import { useState, type FormEvent } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ChoiceCards, type Choice } from "@/components/ui/choice-cards";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { changeProducer } from "@/lib/production/role-actions";

const t = fr.productionProducer.change;

/**
 * « Changer qui produit » (proto pqChangeModal): who produces today, what
 * was already done and what the new journey takes over, the amount already
 * engaged, the new choice, the previous company's link to revoke (checked)
 * and the reason. Nothing of the current journey is erased.
 */
export function ChangeProducerButton({
  projectId,
  sheetId,
  deliverableTitle,
  today,
  choices,
  done,
  carried,
  engaged,
  revokeName,
}: {
  projectId: string;
  sheetId: string;
  deliverableTitle: string;
  // « Externe · Studio Ressac ».
  today: string;
  // « internal » or « external:<contactId> ».
  choices: Choice<string>[];
  done: string[];
  carried: string[];
  // The callout on the amount engaged with the current company, if any.
  engaged: string | null;
  // The current company, when its private link is active.
  revokeName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(
    choices[0]?.value ?? null,
  );
  const [revoke, setRevoke] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, error, run } = useWriteSubmit(() => setOpen(false), t.open);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    ).trim();
    const next: Record<string, string> = {};
    if (!choice) next.choice = t.errors.choice;
    if (!reason) next.reason = t.errors.reason;
    setErrors(next);
    if (!choice || !reason) return;
    run(() =>
      changeProducer({
        projectId,
        sheetId,
        deliverableTitle,
        choice,
        reason,
        revoke: Boolean(revokeName) && revoke,
        done,
        carried,
      }),
    );
  }

  return (
    <>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          {t.open}
        </Button>
      </div>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(deliverableTitle)}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
          <p>
            {t.today} : <b className="font-semibold">{today}</b>.
          </p>
          {done.length > 0 && <Lines title={t.done} lines={done} />}
          {carried.length > 0 && <Lines title={t.carried} lines={carried} />}
          {engaged && <ToneCallout tone="warning">{engaged}</ToneCallout>}
          <div className="flex flex-col gap-1.5">
            <ChoiceCards<string>
              name="producer-new"
              legend={t.choice}
              required
              variant="list"
              value={choice}
              onChange={setChoice}
              choices={choices}
            />
            <FieldError id="producer-new-error">{errors.choice}</FieldError>
          </div>
          {revokeName && (
            <CheckboxField
              label={t.revoke(revokeName)}
              hint={t.revokeHint}
              checked={revoke}
              onChange={setRevoke}
            />
          )}
          <TextareaField
            name="reason"
            label={t.reason}
            placeholder={t.reasonPlaceholder}
            required
            rows={3}
            maxLength={1000}
            error={errors.reason}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <DialogFormActions
            pending={pending}
            submitLabel={t.open}
            onCancel={() => setOpen(false)}
          />
        </form>
      </FormDialog>
    </>
  );
}

function Lines({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      <b className="font-semibold">{title}</b>
      <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {lines.join(" · ")}
      </span>
    </div>
  );
}
