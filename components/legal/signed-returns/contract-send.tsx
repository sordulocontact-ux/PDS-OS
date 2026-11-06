"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { MailCard } from "@/components/ui/mail-card";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { todayInParis } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { sendContract } from "@/lib/legal/signed-returns/team-actions";

const fr = { signedReturns, contracts };

const t = fr.signedReturns.team;

/** The e-mail « Envoyer à … » sends, read on the server
 * (`contractSignerDraft`); null when PDS OS cannot e-mail the person. */
export type ContractMailDraft = {
  email: string;
  subject: string;
  message: string;
};

/**
 * « Envoyer le contrat », as the Master sends its package (Sacha,
 * 06/11/2026): with an address, the e-mail PDS OS will send (`MailCard`:
 * to, subject, the message written here, the person's page added at the
 * end), then « Envoyer à … », which puts the validated version on their
 * page (made if need be) and e-mails them; without one, the page alone and
 * its link to copy. « Je l'ai remis autrement », in a dialog, keeps how and
 * the day.
 */
export function ContractSend({
  projectId,
  contractId,
  person,
  draft,
}: {
  projectId: string;
  contractId: string;
  person: string;
  draft: ContractMailDraft | null;
}) {
  const submit = useWriteSubmit(undefined, t.sent(person));
  const [message, setMessage] = useState(draft?.message ?? "");
  return (
    <div className="flex flex-col gap-3">
      {draft ? (
        <MailCard
          to={`${person} <${draft.email}>`}
          subject={draft.subject}
          message={message}
          onMessage={setMessage}
          name={`contract-message-${contractId}`}
          added={{ open: fr.contracts.now.auto.open }}
        />
      ) : (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.sendNote(person)}
        </p>
      )}
      <FormMessage kind="error">{submit.error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={submit.pending}
          aria-busy={submit.pending || undefined}
          onClick={() =>
            submit.run(() =>
              sendContract({
                projectId,
                contractId,
                via: "link",
                message: draft ? message : undefined,
              }),
            )
          }
        >
          {t.sendTo(person)}
        </Button>
        {/* A gesture that asks for something opens a dialog (proto v3). */}
        <DialogButton
          label={t.other}
          variant="outline"
          title={t.other}
          description={t.otherBody(person)}
        >
          {(close) => (
            <SentOtherwiseForm
              projectId={projectId}
              contractId={contractId}
              onDone={() => {
                close();
              }}
              onCancel={close}
            />
          )}
        </DialogButton>
      </div>
    </div>
  );
}

/** « Je l'ai remis autrement »: how, and the day. */
function SentOtherwiseForm({
  projectId,
  contractId,
  onDone,
  onCancel,
}: {
  projectId: string;
  contractId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const today = todayInParis(new Date());
  const [how, setHow] = useState<string | null>(null);
  const [on, setOn] = useState(today);
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(onDone, t.noted);
  const howError = tried && !how ? t.errors.how : undefined;
  const onError = tried && (!on || on > today) ? t.errors.date : undefined;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!how || !on || on > today) return;
        submit.run(() =>
          sendContract({ projectId, contractId, via: "other", how, on }),
        );
      }}
    >
      <ChoiceCards
        name={`send-how-${contractId}`}
        legend={t.howLegend}
        required
        variant="list"
        value={how}
        onChange={setHow}
        choices={t.ways.map((w) => ({ value: w, label: w }))}
      />
      {howError && <FormMessage kind="error">{howError}</FormMessage>}
      <Field
        name={`send-on-${contractId}`}
        type="date"
        label={t.on}
        aria-required
        max={today}
        value={on}
        error={onError}
        onChange={(event) => setOn(event.target.value)}
        className="h-10 w-fit"
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.note}
        onCancel={onCancel}
      />
    </form>
  );
}
