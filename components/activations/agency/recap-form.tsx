"use client";

import { useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { sendAgencyRecap } from "@/lib/activations/agency/report-actions";
import { activationBrief } from "@/lib/i18n/fr/activation-brief";

const fr = { activationBrief };

const t = fr.activationBrief.recap;

/**
 * « Récapitulatif pour <agence> » (proto agencySection): the message written
 * by code from the decisions, editable, then « Marquer comme envoyé » —
 * no separate review: the person who sends it reads it.
 */
export function RecapForm({
  projectId,
  activationId,
  agency,
  subject,
  body,
  canEmail = false,
}: {
  projectId: string;
  activationId: string;
  agency: string;
  subject: string;
  body: string;
  // PDS OS can e-mail the agency's contact (SMTP set, address in the Réseau).
  canEmail?: boolean;
}) {
  const message = useRef<HTMLTextAreaElement>(null);
  const { pending, error, run } = useWriteSubmit(undefined, t.done);
  // The e-mail did not leave: the owner sends it, then declares it.
  const [manual, setManual] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        const text = String(
          new FormData(event.currentTarget).get("body") ?? "",
        );
        run(async () => {
          const result = await sendAgencyRecap({
            projectId,
            activationId,
            subject,
            body: text,
            manual,
          });
          if (!result.ok && "emailFailed" in result) setManual(true);
          return result;
        });
      }}
    >
      <h3 className="text-[length:var(--type-body-sm)] font-semibold">
        {t.title(agency)}
      </h3>
      <TextareaField
        ref={message}
        name="body"
        label={t.message}
        rows={8}
        defaultValue={body}
        hint={t.source}
        maxLength={20000}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {canEmail && !manual ? t.sendByEmail : manual ? t.sendManual : t.send}
        </Button>
        <CopyButton
          value={() => message.current?.value ?? body}
          label={t.copy}
          copiedLabel={t.copied}
          variant="ghost"
          size="sm"
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}
