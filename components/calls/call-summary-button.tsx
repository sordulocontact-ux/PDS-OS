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
 * PDS OS); for the guests outside, the same message is written from one's
 * own mailbox (`mailto:`), PDS OS sends no e-mail itself.
 */
export function CallSummaryButton({
  callId,
  subject,
  draft,
  recipients,
}: {
  callId: string;
  subject: string;
  draft: string;
  recipients: PrepPerson[];
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
  onDone,
}: {
  callId: string;
  subject: string;
  draft: string;
  recipients: PrepPerson[];
  onDone: () => void;
}) {
  const t = fr.callPage.summary;
  const router = useRouter();
  const [text, setText] = useState(draft);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const emails = recipients.flatMap((p) =>
    p.external && p.email ? [p.email] : [],
  );

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
          toast.success(t.sent);
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
      {emails.length > 0 && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.externals}
          </p>
          <a
            href={mailtoHref(emails.join(","), subject, text)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ButtonRoll>{t.mailto}</ButtonRoll>
          </a>
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
