"use client";

import { useState } from "react";

import { CallFacts } from "@/components/calls/call-facts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MeetingData, MeetingLine } from "@/lib/calls/meeting/types";
import { callWhen } from "@/lib/calls/prep/dates";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { meeting } from "@/lib/i18n/fr/meeting";

import { MeetingLineRow } from "./meeting-line";

const fr = { callPrep, meeting };

function Section({
  title,
  lines,
  empty,
}: {
  title: string;
  lines: MeetingLine[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-body-md font-semibold">{title}</h3>
      {lines.length ? (
        <ul className="flex flex-col">
          {lines.map((line) => (
            <MeetingLineRow key={line.id} line={line} />
          ))}
        </ul>
      ) : (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {empty}
        </p>
      )}
    </section>
  );
}

/**
 * « Lire le compte rendu » (proto `crModal`), a wide modal: date, format and
 * length, participants, where it comes from, then one section per agenda
 * point with what was said there (or « Rien n'a été dit sur ce point. »),
 * what was said outside the agenda, what was added afterwards.
 */
export function MeetingReportDialog({ meeting }: { meeting: MeetingData }) {
  const t = fr.meeting;
  const [open, setOpen] = useState(false);
  const said = meeting.lines.filter((l) => !l.added);
  const known = new Set(meeting.agenda);
  const loose = said.filter((l) => !l.topic || !known.has(l.topic));
  const added = meeting.lines.filter((l) => l.added);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {t.readReport}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t.close} className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t.title(meeting.name)}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="flex flex-col gap-6">
              <CallFacts
                facts={[
                  { label: t.date, value: callWhen(meeting.occurredAt) },
                  {
                    label: t.format,
                    value: t.formatValue(
                      meeting.format
                        ? fr.callPrep.formats[meeting.format]
                        : null,
                      meeting.minutes,
                    ),
                  },
                  {
                    label: t.participants,
                    value: meeting.participants
                      .map((p) =>
                        t.participantOf(p.external ? null : p.detail, p.name),
                      )
                      .join(" · "),
                  },
                  { label: t.source, value: t.sourceValue },
                ]}
              />
              {meeting.agenda.map((topic, index) => (
                <Section
                  key={topic}
                  title={`${index + 1}. ${topic}`}
                  lines={said.filter((l) => l.topic === topic)}
                  empty={t.nothingSaid}
                />
              ))}
              {(loose.length > 0 || meeting.agenda.length === 0) && (
                <Section title={t.loose} lines={loose} empty={t.looseEmpty} />
              )}
              {added.length > 0 && (
                <Section title={t.added} lines={added} empty="" />
              )}
              <p className="text-caption text-[color:var(--text-secondary)]">
                {t.footer}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
