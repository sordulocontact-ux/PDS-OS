"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MeetingData, MeetingLine } from "@/lib/calls/meeting/types";
import { callWhen } from "@/lib/calls/prep/dates";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { meeting } from "@/lib/i18n/fr/meeting";

import { MeetingLineRow } from "./meeting-line";

const fr = { callPrep, meeting };

/** A titled group of lines, in one frame (the look of FactRows). */
function Section({ title, lines }: { title: string; lines: MeetingLine[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-body-md font-semibold">{title}</h3>
      <ul className="flex flex-col rounded-xl border border-[color:var(--border-hairline)] px-4">
        {lines.map((line) => (
          <MeetingLineRow key={line.id} line={line} />
        ))}
      </ul>
    </section>
  );
}

/**
 * « Lire le compte rendu » (proto `crModal`), a wide modal: when, format,
 * length and who under the title; then only the agenda points where
 * something was said, each in its frame, and one line for those left
 * untouched (« Pas abordé : … ») instead of a « Rien n'a été dit » per
 * point (Sacha 05/11/2026, « vraiment moche »); what was said outside the
 * agenda, what was added afterwards; where it comes from at the foot.
 */
export function MeetingReportDialog({ meeting }: { meeting: MeetingData }) {
  const t = fr.meeting;
  const [open, setOpen] = useState(false);
  const said = meeting.lines.filter((l) => !l.added);
  const known = new Set(meeting.agenda);
  const loose = said.filter((l) => !l.topic || !known.has(l.topic));
  const added = meeting.lines.filter((l) => l.added);
  const points = meeting.agenda.map((topic, index) => ({
    title: `${index + 1}. ${topic}`,
    topic,
    lines: said.filter((l) => l.topic === topic),
  }));
  const untouched = points.filter((p) => p.lines.length === 0);
  const nothing = said.length === 0 && added.length === 0;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {t.readReport}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t.close} className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.title(meeting.name)}</DialogTitle>
            <DialogDescription className="flex flex-col gap-0.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
              <span>
                {[
                  callWhen(meeting.occurredAt),
                  t.formatValue(
                    meeting.format ? fr.callPrep.formats[meeting.format] : null,
                    meeting.minutes,
                  ),
                ].join(" · ")}
              </span>
              <span>
                {meeting.participants
                  .map((p) =>
                    t.participantOf(p.external ? null : p.detail, p.name),
                  )
                  .join(" · ")}
              </span>
            </DialogDescription>
          </DialogHeader>
          {open && (
            <div className="flex flex-col gap-6">
              {nothing && (
                <p className="text-body-md text-[color:var(--text-secondary)]">
                  {t.nothingAtAll}
                </p>
              )}
              {points
                .filter((p) => p.lines.length > 0)
                .map((p) => (
                  <Section key={p.topic} title={p.title} lines={p.lines} />
                ))}
              {loose.length > 0 && <Section title={t.loose} lines={loose} />}
              {added.length > 0 && <Section title={t.added} lines={added} />}
              {!nothing && untouched.length > 0 && (
                <p className="text-body-sm text-[color:var(--text-secondary)]">
                  {t.notDiscussed(untouched.map((p) => p.topic).join(", "))}
                </p>
              )}
              <p className="border-t border-[color:var(--border-hairline)] pt-4 text-caption text-[color:var(--text-tertiary)]">
                {t.sourceValue}. {t.footer}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
