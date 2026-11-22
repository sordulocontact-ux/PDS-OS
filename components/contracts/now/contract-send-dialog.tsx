"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { envelopeErrors } from "@/components/ui/mail-card";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  emailContractForSignature,
  sendContractForSignature,
} from "@/lib/contracts/send-actions";
import { todayInParis } from "@/lib/contracts/types";
import { addressesOf, type MailEnvelope } from "@/lib/email/addresses";
import { contracts } from "@/lib/i18n/fr/contracts";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";

import { ContractMailDraft, type MailAttachment } from "./contract-mail-draft";

const fr = { contracts, signedReturns };

const t = fr.contracts.now;
const team = fr.signedReturns.team;

export type SendMail = {
  to: { contactId: string; email: string | null } | null;
  subject: string;
  message: string;
  attachment?: MailAttachment | null;
  // The person's private link: sent there when it is active.
  link: string | null;
  viaLink: boolean;
  // PDS OS e-mails the signer itself on their link (SMTP, address, link).
  auto?: boolean;
  // PDS OS can send e-mails at all (SMTP set), though not this one.
  smtp?: boolean;
};

/**
 * « Envoyer pour signature » (proto `sendC`): the e-mail ready — recipient
 * from the Réseau, attachment, private link — opened in the person's own
 * mail app or copied, then « Marquer comme envoyé »; or « Je l'ai remis
 * autrement », how and the day. Both record the sending (send_contract).
 */
export function ContractSendDialog({
  contractId,
  projectId,
  mail,
}: {
  contractId: string;
  projectId: string | null;
  mail: SendMail;
}) {
  return (
    <DialogButton
      label={t.send.button}
      variant="default"
      size="lg"
      title={t.send.button}
      description={t.send.description}
      wide
    >
      {(close) => (
        <SendForm
          contractId={contractId}
          projectId={projectId}
          mail={mail}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function SendForm({
  contractId,
  projectId,
  mail,
  onDone,
}: {
  contractId: string;
  projectId: string | null;
  mail: SendMail;
  onDone: () => void;
}) {
  const today = todayInParis(new Date());
  const [way, setWay] = useState<"mail" | "other">("mail");
  // PDS OS sends this e-mail itself (SMTP set, an address, no private
  // link to send it on): Sacha 22/11/2026.
  const byPds = !mail.auto && Boolean(mail.smtp) && Boolean(mail.to?.email);
  const [message, setMessage] = useState(mail.message);
  const [envelope, setEnvelope] = useState<MailEnvelope>({
    to: mail.to?.email ?? "",
    cc: "",
    bcc: "",
    subject: mail.subject,
  });
  const [how, setHow] = useState<string | null>(null);
  const [on, setOn] = useState(today);
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(onDone, t.send.sent);
  const howError =
    tried && way === "other" && !how ? team.errors.how : undefined;
  const onError =
    tried && way === "other" && (!on || on > today)
      ? team.errors.date
      : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (way === "mail" && byPds) {
          if (Object.values(envelopeErrors(envelope)).some(Boolean)) return;
          return submit.run(() =>
            emailContractForSignature({
              contractId,
              projectId,
              envelope: {
                to: addressesOf(envelope.to),
                cc: addressesOf(envelope.cc),
                bcc: addressesOf(envelope.bcc),
              },
              subject: envelope.subject,
              message,
            }),
          );
        }
        if (way === "mail")
          return submit.run(() =>
            sendContractForSignature(
              mail.viaLink
                ? { contractId, projectId, via: "link" }
                : // From their mail app: one of the ways send_contract knows.
                  {
                    contractId,
                    projectId,
                    via: "other",
                    how: team.ways[2],
                    on: today,
                  },
            ),
          );
        if (!how || !on || on > today) return;
        submit.run(() =>
          sendContractForSignature({
            contractId,
            projectId,
            via: "other",
            how,
            on,
          }),
        );
      }}
    >
      {/* The e-mail at once: it is how a contract leaves almost always;
          handed another way is the exception, one link away (Sacha
          22/11/2026: « j'aime pas ce composant »). */}
      {way === "mail" && mail.auto ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.auto.byMailAutoHint}
        </p>
      ) : way === "mail" ? (
        <ContractMailDraft
          to={mail.to}
          subject={mail.subject}
          attachment={mail.attachment}
          link={mail.link}
          message={mail.message}
          smtp={mail.smtp}
          bySelf={!byPds}
          onMessage={setMessage}
          envelope={
            byPds
              ? { value: envelope, onChange: setEnvelope, tried }
              : undefined
          }
        />
      ) : (
        <>
          <ChoiceCards
            name={`send-how-${contractId}`}
            legend={team.howLegend}
            required
            variant="list"
            value={how}
            onChange={setHow}
            choices={team.ways.map((w) => ({ value: w, label: w }))}
          />
          {howError && <FormMessage kind="error">{howError}</FormMessage>}
          <Field
            name={`send-on-${contractId}`}
            type="date"
            label={team.on}
            required
            max={today}
            value={on}
            error={onError}
            onChange={(event) => setOn(event.target.value)}
            className="h-10 w-fit"
          />
        </>
      )}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="w-fit px-0"
        onClick={() => setWay(way === "mail" ? "other" : "mail")}
      >
        {way === "mail" ? t.send.otherwise : t.send.backToMail}
      </Button>
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={
          way === "mail" && mail.auto
            ? t.auto.sendButton
            : way === "mail" && byPds
              ? t.sendMail.button
              : t.send.markSent
        }
        onCancel={onDone}
      />
    </form>
  );
}
