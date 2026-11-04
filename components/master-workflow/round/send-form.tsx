"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { sendRound } from "@/lib/master-workflow/round-actions";

const fr = { masterRound };

const t = fr.masterRound;

/**
 * The sending gesture (proto): « Envoyer à Karim Haddou », with the written
 * waiver when stems are missing (« Pourquoi envoyer quand même * »). `mail`:
 * PDS OS sends the e-mail itself, its message written here (kept as the
 * package's note), the private link added at the end.
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
  mail?: { defaultMessage: string } | null;
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
            Boolean(mail),
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
        <TextareaField
          name={`mail-message-${stage}`}
          label={t.email.message}
          rows={3}
          maxLength={2000}
          value={message}
          hint={`${t.email.link} ${t.email.sendHint}`}
          onChange={(e) => setMessage(e.target.value)}
        />
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
