"use client";

import {
  IconEnvelopeOpen,
  IconPenWriting2,
  IconXmark,
} from "nucleo-sharp-essential";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { advanceMessage } from "@/lib/activations/messages/actions";
import { emailActivationMessage } from "@/lib/activations/messages/email-actions";
import type { MessageRecord } from "@/lib/activations/messages/queries";
import type { MessageKind } from "@/lib/activations/model";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { mailtoHref } from "@/lib/utils/mailto";

import { ReasonForm } from "@/components/ui/reason-form";
import { DeclareSentForm } from "./declare-sent-form";
import { MessageForm, type MessageDefaults } from "./message-form";

const fr = { activationWork };

const t = fr.activationWork.messages;

/** The acts of one message, by its status : edit and submit a draft ;
 * validate or send back ; e-mail it, then declare the send (copy it, open it
 * in the mail app and cancel it: icon and « ⋯ »). */
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
  const validated = m.status === "validated";
  const more: RowAction[] = [];
  if (validated && email && m.channel === "email")
    more.push({
      key: "mailto",
      label: t.mailto,
      icon: IconEnvelopeOpen,
      href: mailtoHref(email, m.subject ?? "", m.body),
    });
  if (m.status !== "sent_declared" && m.status !== "cancelled")
    more.push({
      key: "cancel",
      label: t.cancel,
      icon: IconXmark,
      onSelect: () => {
        if (!pending) act("cancel", t.cancelled);
      },
    });
  // At most two text buttons, the rest in icons or « ⋯ » (docs/DESIGN.md,
  // « Rangée de boutons »).
  return (
    <div className="flex flex-wrap items-center gap-2">
      {m.status === "draft" && (
        <>
          <DialogButton
            label={t.edit}
            icon={IconPenWriting2}
            iconOnly
            iconSize="icon-sm"
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
      {validated && (
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
          <DialogButton
            label={t.declare}
            size="xs"
            variant={canEmail ? "outline" : "default"}
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
          <CopyButton
            value={text}
            label=""
            ariaLabel={t.copy}
            copiedLabel={t.copied}
            size="icon-sm"
          />
        </>
      )}
      {mail.error && <FormMessage kind="error">{mail.error}</FormMessage>}
      <RowActions label={t.more} actions={more} />
    </div>
  );
}
