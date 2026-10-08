"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { saveTrack } from "@/lib/catalog/master/item-actions";
import type { MasterSession, MasterTrack } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";
import { sessionLabel } from "@/lib/catalog/master/session-label";

export function TrackForm({
  masterId,
  track,
  sessions,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  track: MasterTrack | null;
  sessions: MasterSession[];
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.tracks;
  // "none" = not tied to a session (a select has no empty value).
  const sessionItems: Record<string, string> = {
    none: t.fields.noSession,
    ...Object.fromEntries(sessions.map((s) => [s.id, sessionLabel(s)])),
  };
  return (
    <MasterForm
      action={saveTrack}
      defaults={defaults}
      hidden={{ masterId, itemId: track?.id }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          <Field
            name="name"
            label={t.fields.name}
            hint={t.fields.nameHint}
            required
            autoFocus
            autoComplete="off"
            maxLength={200}
            defaultValue={value("name", track?.name)}
            error={error("name")}
          />
          <Field
            name="performer"
            label={t.fields.performer}
            autoComplete="off"
            maxLength={200}
            defaultValue={value("performer", track?.performer)}
            error={error("performer")}
          />
          {sessions.length > 0 && (
            <OptionSelect
              name="sessionId"
              label={t.fields.session}
              items={sessionItems}
              defaultValue={value("sessionId", track?.sessionId ?? "none")}
              error={error("sessionId")}
            />
          )}
        </>
      )}
    </MasterForm>
  );
}
