"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { AttendeeChipList } from "@/components/calls/prep/attendee-chip";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { sendMeetingSummary } from "@/lib/calls/meeting/actions";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { callPage } from "@/lib/i18n/fr/calls-page";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { callPage };

/**
 * « Relire et envoyer » (proto `docs/protos/pages.html`, window « Résumé
 * pour les participants »): the message drafted by code from the report,
 * read and corrected, sent as the call's next version (members told in
 * PDS OS). The guests outside with an address are e-mailed by PDS OS itself
 * when its e-mail is on (`emailEnabled`, lib/email/send.ts), the result
 * said in the toast (« … et par e-mail à X, Y »); only the others (no
 * address, a private link) or every guest when e-mail is off get the
 * message written from one's own mailbox (`mailto:`).
 */
export function CallSummaryButton({
  callId,
  subject,
  draft,
  recipients,
  emailEnabled,
}: {
  callId: string;
  subject: string;
  draft: string;
  recipients: PrepPerson[];
  emailEnabled: boolean;
}) {
  const t = fr.callPage;
  return (
    <DialogButton
      label={t.now.summary.action}
      variant="default"
      size="default"
      title={t.summary.title}
      description={t.summary.description}
      wide
    >
      {(close) => (
        <SummaryForm
          callId={callId}
          subject={subject}
          draft={draft}
          recipients={recipients}
          emailEnabled={emailEnabled}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function SummaryForm({
  callId,
  subject,
  draft,
  recipients,
  emailEnabled,
  onDone,
}: {
  callId: string;
  subject: string;
  draft: string;
  recipients: PrepPerson[];
  emailEnabled: boolean;
  onDone: () => void;
}) {
  const t = fr.callPage.summary;
  const router = useRouter();
  const [text, setText] = useState(draft);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The same split as the server (sendMeetingSummary): an outside guest
  // with an address and no private link is e-mailed by PDS OS.
  const outside = recipients.filter((p) => p.external);
  const emailed = emailEnabled
    ? outside.filter((p) => p.email && (p.invite ?? "email") === "email")
    : [];
  const byHand = outside.filter((p) => !emailed.includes(p));
  const handEmails = byHand.flatMap((p) => (p.email ? [p.email] : []));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!text.trim())
          return document.getElementById("summary-message")?.focus();
        startTransition(async () => {
          const result = await sendMeetingSummary({ callId, text });
          if (!result.ok) return setError(result.error);
          // Who got it by e-mail, or who still has to be written to.
          if (result.notice) toast.warning(result.notice);
          else toast.success(result.done ?? t.sent);
          onDone();
          // An internal meeting's page is not revalidated by the action.
          router.refresh();
        });
      }}
    >
      <dl className="grid gap-3 text-body-md sm:grid-cols-[6rem_minmax(0,1fr)]">
        <dt className="text-[color:var(--text-secondary)]">{t.to}</dt>
        <dd className="flex flex-col gap-1">
          <AttendeeChipList people={recipients} />
          <span className="text-caption text-[color:var(--text-tertiary)]">
            {t.toSource}
          </span>
        </dd>
        <dt className="text-[color:var(--text-secondary)]">{t.subject}</dt>
        <dd className="font-semibold break-words">{subject}</dd>
      </dl>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <TextareaField
        id="summary-message"
        name="message"
        label={t.message}
        aria-required
        rows={12}
        maxLength={10000}
        value={text}
        error={tried && !text.trim() ? t.messageMissing : undefined}
        onChange={(e) => setText(e.target.value)}
      />
      {outside.length > 0 && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-caption text-[color:var(--text-secondary)]">
            {!emailEnabled
              ? t.externals
              : [
                  emailed.length > 0 && t.emailedTo(emailed.map((p) => p.name)),
                  byHand.length > 0 && t.byHand(byHand.map((p) => p.name)),
                ]
                  .filter(Boolean)
                  .join(" ")}
          </p>
          {byHand.length > 0 && (
            <a
              href={mailtoHref(handEmails.join(","), subject, text)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ButtonRoll>{t.mailto}</ButtonRoll>
            </a>
          )}
        </div>
      )}
      <DialogFormActions
        onCancel={onDone}
        submitLabel={t.send}
        pending={pending}
      />
    </form>
  );
}
