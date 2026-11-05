"use client";

import { IconEnvelopeOpen } from "nucleo-sharp-essential";
import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { AttendeeChipList } from "@/components/calls/prep/attendee-chip";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { sendMeetingSummary } from "@/lib/calls/meeting/actions";
import type { SummaryVersion } from "@/lib/calls/meeting/types";
import { shortStamp } from "@/lib/calls/prep/dates";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { meeting } from "@/lib/i18n/fr/meeting";
import { meetingSummaryTone } from "@/lib/ui/state-tones";
import { routes } from "@/lib/auth/redirects";

import { SummaryPdfButton } from "./summary-pdf-button";

const fr = { meeting };

/**
 * « Résumé pour les participants » (proto `summaryBlock`), once everything
 * said was settled: the e-mail card of a step (DocumentCard with the
 * envelope, like the Master's), its recipients and how each one gets it,
 * the message drafted by code from what was confirmed, read and corrected,
 * then « Envoyer aux participants » under it. Sent:
 * the last version, « Corriger et renvoyer » = the next one, from its text.
 * Someone else than the owner reads who is expected to send it.
 */
export function MeetingSummaryBlock({
  callId,
  draft,
  recipients,
  versions,
  canSend,
  ownerName,
}: {
  callId: string;
  draft: string;
  // Who it goes to (the call's participants but the sender).
  recipients: PrepPerson[];
  // Latest first.
  versions: SummaryVersion[];
  canSend: boolean;
  ownerName: string | null;
}) {
  const t = fr.meeting.summary;
  const last = versions[0] ?? null;
  const [editing, setEditing] = useState(!last);
  const [text, setText] = useState(draft);
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setEditing(false),
    t.done,
  );
  const externals = recipients.filter((p) => p.external);
  // How each one receives it: the outside guests by e-mail from PDS OS (or
  // on their private link), the team in PDS OS.
  const howLine = externals.length
    ? t.howList(
        externals
          .map((p) =>
            t.howOf(p.name, p.invite === "link" ? t.how.link : t.how.email),
          )
          .join(", "),
      )
    : t.teamOnly;
  // The report's PDF goes with the e-mail (Sacha 05/11/2026).
  const byEmail = externals.some((p) => p.invite !== "link");

  if (!last && !canSend)
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-body-md font-semibold">{t.heading}</h3>
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.waiting(ownerName ?? "—")}
        </p>
      </section>
    );

  if (editing && canSend) {
    const missing = tried && !text.trim();
    return (
      <div className="flex flex-col gap-3">
        <DocumentCard
          name={last ? t.headingVersion(last.version + 1) : t.heading}
          line={t.note}
          icon={IconEnvelopeOpen}
        >
          <FactRows className="rounded-none border-0">
            <FactRow
              label={t.recipients}
              value={
                recipients.length ? (
                  <AttendeeChipList people={recipients} />
                ) : (
                  t.recipientsNone
                )
              }
              source={byEmail ? `${howLine} ${t.attached}` : howLine}
            />
          </FactRows>
          <div className="flex flex-col gap-1.5 px-3.5 pt-1 pb-3.5">
            <Label htmlFor={`summary-${callId}`}>{t.message}</Label>
            <Textarea
              id={`summary-${callId}`}
              rows={9}
              value={text}
              maxLength={10000}
              aria-invalid={missing || undefined}
              onChange={(e) => setText(e.target.value)}
            />
            {missing && (
              <FieldError id={`summary-${callId}-error`}>
                {t.messageMissing}
              </FieldError>
            )}
          </div>
        </DocumentCard>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => {
              setTried(true);
              if (text.trim()) run(() => sendMeetingSummary({ callId, text }));
            }}
          >
            {pending ? t.sending : t.send}
          </Button>
          {last && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              {t.cancel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!last) return null;
  return (
    <DocumentCard
      name={t.sent}
      line={t.sentBy(
        last.sentBy ?? "—",
        shortStamp(last.sentAt),
        last.count,
        versions.length > 1,
      )}
      icon={IconEnvelopeOpen}
      action={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={meetingSummaryTone} size="sm">
            {t.sentBadge(last.version)}
          </StatusBadge>
          <SummaryPdfButton
            href={routes.callSummaryPdf(callId, last.version)}
          />
        </span>
      }
    >
      <div className="flex flex-col gap-3 px-3.5 py-3">
        <p className="text-body-md leading-[1.55] whitespace-pre-line">
          {last.text}
        </p>
        {canSend && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setText(last.text);
              setEditing(true);
            }}
          >
            {t.correct}
          </Button>
        )}
      </div>
    </DocumentCard>
  );
}
