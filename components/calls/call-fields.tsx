"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";

/**
 * The fields of a new call: title, date and time, optional video link.
 * Shared by "Nouveau call" and the "Préparer un échange" of the Master, the
 * Cadrage and the Stratégie. The date
 * is typed in the browser's zone: send the form through `withOccurredAt`.
 */
export function CallFields({
  defaultTitle,
  defaultOccurredAt,
  idPrefix = "call",
  withLink = true,
}: {
  defaultTitle: string;
  // "YYYY-MM-DDTHH:mm", the browser's zone.
  defaultOccurredAt: string;
  // Two forms on one page keep distinct ids.
  idPrefix?: string;
  // No video link for a call held on site or by phone.
  withLink?: boolean;
}) {
  const t = fr.calls.create;
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-title`} required>
          {t.fieldTitle}
        </Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          required
          maxLength={200}
          autoComplete="off"
          defaultValue={defaultTitle}
          placeholder={t.titlePlaceholder}
          className="h-10"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-date`} required>
          {t.fieldDate}
        </Label>
        <Input
          id={`${idPrefix}-date`}
          name="occurredAtLocal"
          type="datetime-local"
          required
          defaultValue={defaultOccurredAt}
          aria-describedby={`${idPrefix}-date-hint`}
          className="h-10 w-fit"
        />
        <p
          id={`${idPrefix}-date-hint`}
          className="text-xs text-muted-foreground"
        >
          {t.dateHint}
        </p>
      </div>
      {withLink && (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-link`}>{t.fieldLink}</Label>
          <Input
            id={`${idPrefix}-link`}
            name="meetingUrl"
            type="url"
            inputMode="url"
            maxLength={500}
            autoComplete="off"
            placeholder={t.linkPlaceholder}
            aria-describedby={`${idPrefix}-link-hint`}
            className="h-10"
          />
          <p
            id={`${idPrefix}-link-hint`}
            className="text-xs text-muted-foreground"
          >
            {t.linkHint}
          </p>
        </div>
      )}
    </>
  );
}

/** datetime-local has no zone: converted with the browser's zone. */
export function withOccurredAt(form: FormData): FormData {
  const date = new Date(String(form.get("occurredAtLocal") ?? ""));
  form.set(
    "occurredAt",
    Number.isNaN(date.getTime()) ? "" : date.toISOString(),
  );
  return form;
}
