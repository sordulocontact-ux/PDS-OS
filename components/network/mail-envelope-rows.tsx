"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FactRow, type FactSource } from "@/components/ui/fact-row";
import { Input } from "@/components/ui/input";
import {
  addressesOf,
  envelopeErrors,
  type MailEnvelope,
} from "@/lib/email/addresses";
import { mail } from "@/lib/i18n/fr/mail";

import { nameOfAddress, RecipientsField } from "./recipients-field";
import { useNetworkEmails } from "./use-network-emails";

const fr = { mail };

type Key = keyof MailEnvelope;

/**
 * « À », « Cc », « Cci » and « Objet » of an e-mail, read as facts and
 * changed one at a time (Sacha 22/11/2026: « pas direct en modif, en
 * cliquant dessus ou sur une icône »): a click on the row or its pencil
 * opens its field — recipients picked in the Réseau or typed, the subject
 * as text —, « OK », Entrée on the empty field or Échap close it.
 */
export function MailEnvelopeRows({
  value,
  onChange,
  tried,
  name,
  source,
  known,
}: {
  value: MailEnvelope;
  onChange: (next: MailEnvelope) => void;
  tried: boolean;
  name: string;
  source?: FactSource | null;
  // Who an address stands for when the caller knows it (by lowercase
  // address): several contacts may share one address, the Réseau's first
  // is not always the one meant (Sacha 24/11/2026).
  known?: Record<string, string>;
}) {
  const t = fr.mail;
  const people = useNetworkEmails();
  const [editing, setEditing] = useState<Key | null>(null);
  const errors: Partial<Record<Key, string>> = tried
    ? envelopeErrors(value)
    : {};
  const labels: Record<Key, string> = {
    to: t.to,
    cc: t.cc,
    bcc: t.bcc,
    subject: t.subject,
  };
  const close = () => setEditing(null);
  const ok = (
    <Button variant="outline" size="sm" onClick={close}>
      {t.done}
    </Button>
  );

  // Cc and Cci only once written or opened (Outlook, Sacha 22/11/2026).
  const shown = (key: Key) =>
    key === "to" ||
    key === "subject" ||
    editing === key ||
    addressesOf(value[key]).length > 0;

  const row = (key: Key) => {
    const label = labels[key];
    const rowSource =
      key === "to" ? (source === undefined ? t.fromNetwork : source) : null;
    const id = `${name}-${key}`;
    if (editing === key)
      return (
        <FactRow
          key={key}
          label={label}
          side={
            key === "to" ? (
              <>
                {/* As Outlook: Cc and Cci open from the « À » field. */}
                {(["cc", "bcc"] as const)
                  .filter((k) => !shown(k))
                  .map((k) => (
                    <Button
                      key={k}
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(k)}
                    >
                      {labels[k]}
                    </Button>
                  ))}
                {ok}
              </>
            ) : (
              ok
            )
          }
          control={
            key === "subject" ? (
              <span className="flex flex-col gap-1.5">
                <Input
                  id={id}
                  autoFocus
                  aria-label={label}
                  aria-invalid={errors.subject ? true : undefined}
                  aria-describedby={errors.subject ? `${id}-error` : undefined}
                  className="h-10"
                  value={value.subject}
                  onChange={(e) =>
                    onChange({ ...value, subject: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      close();
                    }
                  }}
                />
                {errors.subject && (
                  <FieldError id={`${id}-error`}>{errors.subject}</FieldError>
                )}
              </span>
            ) : (
              <RecipientsField
                id={id}
                label={label}
                people={people}
                value={addressesOf(value[key])}
                onChange={(list) =>
                  onChange({ ...value, [key]: list.join(", ") })
                }
                error={errors[key]}
                onDone={close}
              />
            )
          }
          source={null}
        />
      );
    const list = key === "subject" ? [] : addressesOf(value[key]);
    const text =
      key === "subject" ? (
        value.subject
      ) : list.length ? (
        // As a mail app writes them: « Léa Martin <lea@label.fr>, … »;
        // chips only while the row is changed (Sacha 22/11/2026).
        <span>
          {list.map((email, i) => {
            const who =
              known?.[email.toLowerCase()] ?? nameOfAddress(people, email);
            return (
              <span key={email}>
                {i > 0 && ", "}
                {who === email ? (
                  email
                ) : (
                  <>
                    {who}{" "}
                    <span className="text-[color:var(--text-secondary)]">
                      &lt;{email}&gt;
                    </span>
                  </>
                )}
              </span>
            );
          })}
        </span>
      ) : key === "to" && errors.to ? (
        ""
      ) : (
        <span className="text-muted-foreground">{t.nobody}</span>
      );
    return (
      <FactRow
        key={key}
        label={label}
        value={text}
        source={rowSource}
        missing={Boolean(errors[key])}
        missingLabel={errors[key]}
        onClick={() => setEditing(key)}
        hrefLabel={t.edit(label)}
        side={
          <IconPenWriting2
            aria-hidden
            className="size-4 text-[color:var(--text-secondary)]"
          />
        }
      />
    );
  };

  return (
    <>{(["to", "cc", "bcc", "subject"] as const).filter(shown).map(row)}</>
  );
}
