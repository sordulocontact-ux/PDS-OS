"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { routes } from "@/lib/auth/redirects";
import {
  REPORT_SCOPES,
  reportText,
  scopedReport,
  type ReportScope,
} from "@/lib/calls/closure";
import { shareCallReport } from "@/lib/calls/closure-actions";
import type { CallClosure } from "@/lib/calls/closure-queries";
import type { Member } from "@/lib/framing/related";
import { calls } from "@/lib/i18n/fr/calls";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { calls };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * « Partager le compte rendu » (PROJ-AMEL-01): the whole report or its
 * summary, never the transcription nor the audio; members chosen are told
 * and read it in the app; outside addresses get the e-mail the user writes
 * from their own mailbox, the PDF beside. The share is kept in the history.
 */
export function ShareReportForm({
  call,
  closure,
  members,
  guestEmails,
  onDone,
}: {
  call: { id: string; title: string; occurredAt: string };
  closure: CallClosure;
  members: Member[];
  guestEmails: string[];
  onDone: () => void;
}) {
  const t = fr.calls.closure;
  const [scope, setScope] = useState<ReportScope>("full");
  const [people, setPeople] = useState<Set<string>>(new Set());
  const [emailsText, setEmailsText] = useState(guestEmails.join("\n"));
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  const emails = emailsText
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const invalid = emails.find((e) => !EMAIL.test(e));
  const none = people.size === 0 && emails.length === 0;

  // After sharing: the e-mail to write and the PDF, for the outside people.
  if (sent)
    return (
      <div className="flex flex-col gap-4">
        <FormMessage kind="info">{t.shared}</FormMessage>
        <div className="flex flex-wrap gap-2">
          {sent.length > 0 && (
            <a
              href={mailtoHref(
                sent.join(","),
                t.report.subject(call.title),
                reportText(scopedReport(closure.content, scope), call),
              )}
              className={buttonVariants({ size: "lg" })}
            >
              <ButtonRoll>{t.mailto}</ButtonRoll>
            </a>
          )}
          <a
            href={routes.callReportPdf(call.id, closure.version, scope)}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            <ButtonRoll>{t.pdf}</ButtonRoll>
          </a>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (none || invalid) return;
        startTransition(async () => {
          const result = await shareCallReport({
            callId: call.id,
            closureId: closure.id,
            scope,
            personIds: [...people],
            emails,
          });
          if (!result.ok) return setError(result.error);
          setError(null);
          toast.success(t.shared);
          if (emails.length === 0) return onDone();
          setSent(emails);
        });
      }}
    >
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <ChoiceCards
        name="scope"
        legend={t.scope}
        required
        value={scope}
        onChange={setScope}
        choices={REPORT_SCOPES.map((s) => ({
          value: s,
          label: t.scopes[s],
          hint: t.scopeHints[s],
        }))}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t.members}</legend>
        {members.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{t.noMembers}</p>
        ) : (
          members.map((m) => (
            <CheckboxField
              key={m.personId}
              label={m.name}
              checked={people.has(m.personId)}
              onChange={(on) =>
                setPeople((set) => {
                  const next = new Set(set);
                  if (on) next.add(m.personId);
                  else next.delete(m.personId);
                  return next;
                })
              }
            />
          ))
        )}
      </fieldset>
      <TextareaField
        name="emails"
        label={t.emails}
        hint={t.emailsHint}
        rows={3}
        value={emailsText}
        error={
          tried
            ? invalid
              ? t.emailInvalid(invalid)
              : none
                ? t.recipientsMissing
                : undefined
            : undefined
        }
        onChange={(e) => setEmailsText(e.target.value)}
      />
      <DialogFormActions
        onCancel={onDone}
        submitLabel={t.share}
        pending={pending}
      />
    </form>
  );
}
