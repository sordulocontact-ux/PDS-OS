"use client";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { HolderSelect } from "@/components/production/holder-select";
import { fr } from "@/lib/i18n/fr";
import type { PostPeople } from "@/lib/production/post/types";

const t = fr.productionCorrections;

export type CorrectionMissing = "recipient" | "due" | "content";

/** Who must act (required), by when (required) and a message: the fields of
 * a correction request, asked and changed the same way (PROD-031). */
export function CorrectionFields({
  idPrefix,
  people,
  recipient,
  onRecipient,
  dueOn,
  message,
  missing,
}: {
  idPrefix: string;
  people: PostPeople;
  recipient: string;
  onRecipient: (value: string) => void;
  dueOn: string | null;
  message: string | null;
  missing: Set<CorrectionMissing>;
}) {
  return (
    <>
      <HolderSelect
        id={`${idPrefix}-recipient`}
        label={t.recipient}
        noneLabel={t.recipientNone}
        hint={t.recipientHint}
        required
        error={missing.has("recipient") ? t.missing.recipient : undefined}
        value={recipient}
        members={people.members}
        contacts={people.contacts}
        onChange={onRecipient}
      />
      <Field
        id={`${idPrefix}-due`}
        name="dueOn"
        type="date"
        label={t.due}
        hint={t.dueHint}
        required
        defaultValue={dueOn ?? ""}
        error={missing.has("due") ? t.missing.due : undefined}
      />
      <TextareaField
        id={`${idPrefix}-message`}
        name="message"
        label={t.message}
        rows={3}
        maxLength={4000}
        defaultValue={message ?? ""}
        error={missing.has("content") ? t.missing.content : undefined}
      />
    </>
  );
}
