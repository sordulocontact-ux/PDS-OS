"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { AttendeeChipList } from "@/components/calls/prep/attendee-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { sendMeetingSummary } from "@/lib/calls/meeting/actions";
import type { SummaryVersion } from "@/lib/calls/meeting/types";
import { shortStamp } from "@/lib/calls/prep/dates";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import { meetingSummaryTone } from "@/lib/ui/state-tones";

/**
 * « Résumé pour les participants » (proto `summaryBlock`), once everything
 * said was settled: the message drafted by code from what was confirmed,
 * read and corrected, the recipients, « Envoyer aux participants ». Sent:
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
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--border-hairline)] p-4">
        <h3 className="text-body-md font-semibold">
          {last ? t.headingVersion(last.version + 1) : t.heading}
        </h3>
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.note}
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`summary-${callId}`}>{t.message}</Label>
          <Textarea
            id={`summary-${callId}`}
            rows={12}
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
        <div className="flex flex-col gap-1.5">
          <b className="text-body-md font-semibold">{t.recipients}</b>
          {recipients.length ? (
            <AttendeeChipList people={recipients} />
          ) : (
            <span>{t.recipientsNone}</span>
          )}
          <span className="text-caption text-[color:var(--text-tertiary)]">
            {externals.length
              ? t.howList(
                  externals
                    .map((p) =>
                      t.howOf(
                        p.name,
                        p.invite === "link" ? t.how.link : t.how.email,
                      ),
                    )
                    .join(", "),
                )
              : t.teamOnly}
          </span>
        </div>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="lg"
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
              size="lg"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              {t.cancel}
            </Button>
          )}
        </div>
      </section>
    );
  }

  if (!last) return null;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-hairline)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body-md font-semibold">{t.sent}</h3>
        <StatusBadge tone={meetingSummaryTone} size="sm">
          {t.sentBadge(last.version)}
        </StatusBadge>
      </div>
      <p className="text-body-md leading-[1.55] whitespace-pre-line">
        {last.text}
      </p>
      <p className="text-caption text-[color:var(--text-tertiary)]">
        {t.sentBy(
          last.sentBy ?? "—",
          shortStamp(last.sentAt),
          last.count,
          versions.length > 1,
        )}
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
    </section>
  );
}
