"use client";

import { IconEnvelopeOpen } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { sendRound } from "@/lib/master-workflow/round-actions";

const fr = { masterRound };

const t = fr.masterRound;

/** The e-mail before it leaves (proto « L'e-mail que PDS OS enverra »). */
export type SendMail = {
  // PDS OS sends it itself; otherwise the sending is declared after.
  sends: boolean;
  title: string;
  line: string;
  to: string;
  subject: string;
  defaultMessage: string;
  // « Ajouté automatiquement à la fin de l'e-mail : … » and its validity.
  added: string;
  open: string;
  validity: string;
};

/**
 * The sending gesture (proto): the written waiver when stems are missing
 * (« Pourquoi envoyer quand même * »), then `mail`, the e-mail card (À,
 * Objet, the message written here — kept as the package's note — and the
 * private link added at the end), then « Envoyer à Karim Haddou ».
 */
export function SendForm({
  projectId,
  stage,
  engineer,
  label,
  done,
  withoutStems,
  mail = null,
}: {
  projectId: string;
  stage: "mix" | "mastering";
  engineer: string;
  // « Envoyer à Karim Haddou », « Transmettre au mastering », « Renvoyer… ».
  label: string;
  done: string;
  // Titles without stems: the waiver is needed.
  withoutStems: boolean;
  mail?: SendMail | null;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState(mail?.defaultMessage ?? "");
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(() => setReason(""), done);
  const lacking = withoutStems && !reason.trim();
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (lacking) return;
        submit.run(() =>
          sendRound(
            projectId,
            stage,
            mail ? message : "",
            withoutStems ? reason : null,
            done,
            Boolean(mail?.sends),
          ),
        );
      }}
    >
      {withoutStems && (
        <>
          <ToneCallout tone="warning">{t.stems.missing}</ToneCallout>
          <TextareaField
            name={`stems-reason-${stage}`}
            label={t.stems.reason}
            required
            rows={2}
            maxLength={1000}
            value={reason}
            error={tried && lacking ? t.stems.reasonError : undefined}
            onChange={(e) => setReason(e.target.value)}
          />
        </>
      )}
      {mail && (
        <DocumentCard
          name={mail.title}
          line={mail.line}
          icon={IconEnvelopeOpen}
        >
          <FactRows className="rounded-none border-0">
            <FactRow
              label={t.email.to}
              value={mail.to}
              source={t.email.toSource}
            />
            <FactRow label={t.email.subject} value={mail.subject} />
          </FactRows>
          <div className="flex flex-col gap-3 px-3.5 pt-1 pb-3.5">
            <TextareaField
              name={`mail-message-${stage}`}
              label={t.email.message}
              rows={3}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="flex flex-col gap-1 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 break-words">
              <span className="text-[color:var(--text-secondary)]">
                {mail.added}
              </span>
              <span>
                {t.email.openLabel} <i>{mail.open}</i>
              </span>
              <span>{mail.validity}</span>
            </p>
          </div>
        </DocumentCard>
      )}
      <FormMessage kind="error">{submit.error}</FormMessage>
      <Button
        type="submit"
        className="self-start"
        disabled={submit.pending}
        aria-busy={submit.pending || undefined}
      >
        {submit.pending
          ? t.send.sending
          : withoutStems
            ? t.send.toWaiver(engineer)
            : label}
      </Button>
    </form>
  );
}
