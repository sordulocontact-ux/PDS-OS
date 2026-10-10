"use client";

import { Field } from "@/components/auth/field";
import { Checkbox } from "@/components/ui/checkbox";
import { fr } from "@/lib/i18n/fr";

/**
 * The call's video link. With Google Calendar connected, a Meet link is
 * created by default and Google sends the invitations; unticked, or without
 * Google, a link of another tool is pasted.
 */
export function MeetField({
  idPrefix,
  available,
  google,
  onGoogleChange,
  defaultUrl,
  error,
}: {
  idPrefix: string;
  // Whether Google Calendar is connected (lib/integrations/google-calendar.ts).
  available: boolean;
  google: boolean;
  onGoogleChange: (google: boolean) => void;
  defaultUrl?: string;
  error?: string;
}) {
  const t = fr.calls.schedule;
  const useGoogle = available && google;

  return (
    <fieldset className="flex flex-col gap-3">
      {/* Without Google, the link field alone, under its own label. */}
      {available && (
        <legend className="mb-1.5 text-sm font-medium">{t.meetTitle}</legend>
      )}
      {available && (
        <label
          htmlFor={`${idPrefix}-google`}
          className="flex cursor-pointer items-start gap-3"
        >
          <Checkbox
            id={`${idPrefix}-google`}
            size="md"
            checked={google}
            onChange={(e) => onGoogleChange(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{t.meetGoogle}</span>
            <span className="text-xs text-muted-foreground">
              {t.meetGoogleHint}
            </span>
          </span>
        </label>
      )}
      <input type="hidden" name="meet" value={useGoogle ? "google" : "link"} />
      {!useGoogle && (
        <Field
          id={`${idPrefix}-link`}
          name="meetingUrl"
          type="url"
          inputMode="url"
          label={available ? t.meetOther : fr.calls.create.fieldLink}
          maxLength={500}
          autoComplete="off"
          placeholder={fr.calls.create.linkPlaceholder}
          hint={available ? t.meetOtherHint : t.meetUnavailable}
          defaultValue={defaultUrl}
          error={error}
        />
      )}
    </fieldset>
  );
}
