"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveMessage } from "@/lib/activations/messages/actions";
import type { MessageRecord } from "@/lib/activations/messages/queries";
import {
  MESSAGE_CHANNELS,
  type MessageChannel,
  type MessageKind,
} from "@/lib/activations/model";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationWork.messages;

export type MessageDefaults = {
  kind: MessageKind;
  subject: string;
  body: string;
};

/**
 * A draft message : prepared from what is validated (`defaults`, written by
 * code, never by a model), edited by a person ; a follow-up has its date and,
 * when the rules say so, a written exemption. Nothing is sent from here.
 */
export function MessageForm({
  projectId,
  activationId,
  targetId,
  kinds,
  message,
  defaults,
  pressKitId,
  onDone,
}: {
  projectId: string;
  activationId: string;
  targetId: string | null;
  kinds: readonly MessageKind[];
  message: MessageRecord | null;
  defaults: MessageDefaults;
  pressKitId: string | null;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<MessageKind>(message?.kind ?? defaults.kind);
  const [joinKit, setJoinKit] = useState(
    Boolean(message?.pressKitDocumentId ?? pressKitId),
  );
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const body = String(data.get("body") ?? "");
        setMissing(!body.trim());
        if (!body.trim()) return;
        run(() =>
          saveMessage({
            projectId,
            activationId,
            messageId: message?.id ?? null,
            targetId,
            kind,
            subject: String(data.get("subject") ?? ""),
            body,
            channel: String(data.get("channel")) as MessageChannel,
            pressKitDocumentId: joinKit
              ? (message?.pressKitDocumentId ?? pressKitId)
              : null,
            dueOn: String(data.get("dueOn") ?? ""),
            derogationReason: String(data.get("derogation") ?? ""),
          }),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!message && kinds.length > 1 && (
          <OptionSelect
            name="kind"
            label={t.kind}
            required
            items={Object.fromEntries(kinds.map((k) => [k, t.kinds[k]]))}
            defaultValue={kind}
            onValueChange={(v) => setKind(v as MessageKind)}
          />
        )}
        <OptionSelect
          name="channel"
          label={t.channel}
          required
          items={Object.fromEntries(
            MESSAGE_CHANNELS.map((c) => [c, t.channels[c]]),
          )}
          defaultValue={message?.channel ?? "email"}
        />
      </div>
      <Field
        name="subject"
        label={t.subject}
        maxLength={300}
        defaultValue={message?.subject ?? defaults.subject}
      />
      <TextareaField
        name="body"
        label={t.body}
        required
        rows={10}
        maxLength={20000}
        defaultValue={message?.body ?? defaults.body}
        error={missing ? fr.activationWork.errors.bodyRequired : undefined}
      />
      {kind === "follow_up" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="dueOn"
            type="date"
            label={t.dueOn}
            defaultValue={message?.dueOn ?? ""}
          />
          <Field
            name="derogation"
            label={t.derogation}
            hint={t.derogationHint}
            maxLength={1000}
            defaultValue={message?.derogationReason ?? ""}
          />
        </div>
      )}
      {pressKitId && (
        <CheckboxField
          label={t.pressKit}
          checked={joinKit}
          onChange={setJoinKit}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : fr.activationWork.sheet.save}
        </Button>
      </div>
    </form>
  );
}
