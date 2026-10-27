"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { todayInParis } from "@/lib/contracts/types";
import { contactLinks } from "@/lib/i18n/fr/contact-links";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { sendContract } from "@/lib/legal/signed-returns/team-actions";
import { issueContactLink } from "@/lib/portal/contact-link-actions";

const fr = { signedReturns, contactLinks };

const t = fr.signedReturns.team;

/**
 * « Envoyer le contrat » (proto « Projet complet », E6 step 6): « Envoyer à
 * … » puts the validated version on the person's private page, where they
 * deposit it signed; « Je l'ai remis autrement », in a dialog, keeps how
 * and the day. PDS
 * OS sends no e-mail yet: the person's link is copied from the card below.
 */
export function ContractSend({
  projectId,
  contractId,
  contactId,
  person,
  hasLink,
}: {
  projectId: string;
  contractId: string;
  contactId: string | null;
  person: string;
  // An active private link: « Envoyer à … » works; otherwise create it.
  hasLink: boolean;
}) {
  const submit = useWriteSubmit(undefined, t.sent(person));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {hasLink ? t.sendNote(person) : t.noLink(person)}
      </p>
      <FormMessage kind="error">{submit.error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        {hasLink || !contactId ? (
          <Button
            disabled={submit.pending}
            onClick={() =>
              submit.run(() =>
                sendContract({ projectId, contractId, via: "link" }),
              )
            }
          >
            {t.sendTo(person)}
          </Button>
        ) : (
          <Button
            disabled={submit.pending}
            onClick={() =>
              submit.run(
                () => issueContactLink(projectId, contactId),
                fr.contactLinks.created,
              )
            }
          >
            {t.createLink}
          </Button>
        )}
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
