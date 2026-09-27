"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { saveTrack } from "@/lib/catalog/master/item-actions";
import type { MasterSession, MasterTrack } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";
import { sessionLabel } from "./session-label";

export function TrackForm({
  masterId,
  track,
  sessions,
  onDone,
}: {
  masterId: string;
  track: MasterTrack | null;
  sessions: MasterSession[];
  onDone: () => void;
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
      hidden={{ masterId, itemId: track?.id }}
      onDone={onDone}
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
            hint={fr.masterPage.form.optional}
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
