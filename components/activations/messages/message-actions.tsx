"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { advanceMessage } from "@/lib/activations/messages/actions";
import { emailActivationMessage } from "@/lib/activations/messages/email-actions";
import type { MessageRecord } from "@/lib/activations/messages/queries";
import type { MessageKind } from "@/lib/activations/model";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";
import { mailtoHref } from "@/lib/utils/mailto";

import { ReasonForm } from "@/components/ui/reason-form";
import { MessageForm, type MessageDefaults } from "./message-form";

const fr = { activations, activationWork };

const t = fr.activationWork.messages;

function DeclareSentForm({
  projectId,
  messageId,
  today,
  onDone,
}: {
  projectId: string;
  messageId: string;
  today: string;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.declared);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const sentOn = String(data.get("sentOn") ?? "");
        setMissing(!sentOn);
        if (!sentOn) return;
        run(() =>
          advanceMessage({
            projectId,
            messageId,
            action: "declare_sent",
            comment: String(data.get("note") ?? ""),
            sentOn,
            proofUrl: String(data.get("proof") ?? "").trim(),
          }),
        );
      }}
    >
      <Field
        name="sentOn"
        type="date"
        label={t.sentOn}
        required
        max={today}
        defaultValue={today}
        error={missing ? fr.activations.errors.dateRequired : undefined}
      />
      <Field
        name="proof"
        type="url"
        label={t.proof}
        placeholder="https://"
        maxLength={2000}
      />
      <Field name="note" label={t.note} maxLength={1000} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.declare}
        </Button>
      </div>
    </form>
  );
}

/** The acts of one message, by its status : edit and submit a draft ;
 * validate or send back ; copy it or open it in the mail app, then declare
 * the send ; cancel. */
export function MessageActions({
  projectId,
  activationId,
  message: m,
  kinds,
  defaults,
  pressKitId,
  email,
  canEmail = false,
  today,
}: {
  projectId: string;
  activationId: string;
  message: MessageRecord;
  kinds: readonly MessageKind[];
  defaults: MessageDefaults;
  pressKitId: string | null;
  email: string | null;
  // PDS OS can e-mail this message itself (SMTP set, address in the Réseau).
  canEmail?: boolean;
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const mail = useWriteSubmit(undefined, "");
  const act = (action: "submit" | "validate" | "cancel", done: string) =>
    startTransition(async () => {
      const r = await advanceMessage({
        projectId,
        messageId: m.id,
        action,
        comment: "",
        sentOn: "",
        proofUrl: "",
      });
      if (r.ok) toast.success(done);
      else toast.error(r.error);
    });
  const text = [m.subject, m.body].filter(Boolean).join("\n\n");
  return (
    <div className="flex flex-wrap gap-2">
      {m.status === "draft" && (
        <>
          <DialogButton
            label={t.edit}
            size="xs"
            title={t.addTitle}
            description={t.addDescription}
            wide
          >
            {(close) => (
              <MessageForm
                projectId={projectId}
                activationId={activationId}
                targetId={m.targetId}
                kinds={kinds}
                message={m}
                defaults={defaults}
                pressKitId={pressKitId}
                onDone={close}
              />
            )}
          </DialogButton>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() => act("submit", t.actionDone.submit)}
          >
            {t.submit}
          </Button>
        </>
      )}
      {(m.status === "draft" || m.status === "to_validate") && (
        <Button
          type="button"
          size="xs"
          disabled={pending}
          onClick={() => act("validate", t.actionDone.validate)}
        >
          {t.validate}
        </Button>
      )}
      {m.status === "to_validate" && (
        <DialogButton
          label={t.requestChanges}
          size="xs"
          variant="ghost"
          title={t.requestChanges}
          description={t.addDescription}
        >
          {(close) => (
            <ReasonForm
              label={t.reviewComment}
              submitLabel={t.requestChanges}
              doneMessage={t.actionDone.request_changes}
              run={(comment) =>
                advanceMessage({
                  projectId,
                  messageId: m.id,
                  action: "request_changes",
                  comment,
                  sentOn: "",
                  proofUrl: "",
                })
              }
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      {m.status === "validated" && (
        <>
          {canEmail && (
            <Button
              type="button"
              size="xs"
              disabled={mail.pending}
              onClick={() =>
                mail.run(() =>
                  emailActivationMessage({ projectId, messageId: m.id }),
                )
              }
            >
              {t.email.send}
            </Button>
          )}
          <CopyButton
            value={text}
            label={t.copy}
            copiedLabel={t.copied}
            size="xs"
          />
          {email && m.channel === "email" && (
            <a
              href={mailtoHref(email, m.subject ?? "", m.body)}
              className="inline-flex items-center rounded-full border bg-card px-3 text-caption font-medium hover:bg-muted"
            >
              {t.mailto}
            </a>
          )}
          <DialogButton
            label={t.declare}
            size="xs"
            variant="default"
            title={t.declareTitle}
            description={t.declareDescription}
          >
            {(close) => (
              <DeclareSentForm
                projectId={projectId}
                messageId={m.id}
                today={today}
                onDone={close}
              />
            )}
          </DialogButton>
        </>
      )}
      {mail.error && <FormMessage kind="error">{mail.error}</FormMessage>}
      {m.status !== "sent_declared" && m.status !== "cancelled" && (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => act("cancel", t.cancelled)}
        >
          {t.cancel}
        </Button>
      )}
    </div>
  );
}
