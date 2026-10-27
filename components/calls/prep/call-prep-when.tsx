"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import type { PrepFormat } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

const fr = { callPrep };

/** Date *, Heure *, Format; the link of the video when it is one. */
export function CallPrepWhen({
  date,
  time,
  format,
  formats,
  link,
  googleMeet,
  errors,
  onDate,
  onTime,
  onFormat,
  onLink,
}: {
  date: string;
  time: string;
  format: PrepFormat;
  formats: readonly PrepFormat[];
  link: string;
  googleMeet: boolean;
  errors: { date?: string; time?: string; link?: string };
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  onFormat: (value: PrepFormat) => void;
  onLink: (value: string) => void;
}) {
  const t = fr.callPrep;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          id="call-prep-date"
          name="date"
          type="date"
          label={t.date}
          required
          value={date}
          onChange={(e) => onDate(e.target.value)}
          error={errors.date}
        />
        <Field
          id="call-prep-time"
          name="time"
          type="time"
          label={t.time}
          required
          value={time}
          onChange={(e) => onTime(e.target.value)}
          error={errors.time}
        />
        {formats.length > 1 && (
          <OptionSelect
            id="call-prep-format"
            name="format"
            label={t.format}
            items={Object.fromEntries(formats.map((f) => [f, t.formats[f]]))}
            defaultValue={format}
            onValueChange={(value) => onFormat(value as PrepFormat)}
          />
        )}
      </div>
      {format === "video" &&
        (googleMeet ? (
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.linkGoogle}
          </p>
        ) : (
          <Field
            id="call-prep-link"
            name="meetingUrl"
            type="url"
            inputMode="url"
            label={t.link}
            placeholder="https://"
            hint={t.linkHint}
            value={link}
            onChange={(e) => onLink(e.target.value)}
            error={errors.link}
          />
        ))}
    </div>
  );
}
