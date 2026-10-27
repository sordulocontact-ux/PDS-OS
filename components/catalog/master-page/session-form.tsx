"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { saveSession } from "@/lib/catalog/master/item-actions";
import {
  SESSION_KINDS,
  type MasterSession,
  type SessionKind,
} from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";

import { MasterForm } from "./master-form";
import { SessionEngineerField } from "./session-engineer-field";

const fr = { masterPage };

const isSessionKind = (value: string | undefined): value is SessionKind =>
  (SESSION_KINDS as readonly string[]).includes(value ?? "");

export function SessionForm({
  masterId,
  session,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  session: MasterSession | null;
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.sessions;
  // The engineer proposed follows the kind of session (credit of that work).
  const proposed = defaults?.kind;
  const [kind, setKind] = useState<SessionKind>(
    isSessionKind(proposed) ? proposed : (session?.kind ?? "recording"),
  );
  return (
    <MasterForm
      action={saveSession}
      defaults={defaults}
      hidden={{ masterId, itemId: session?.id }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          <OptionSelect
            name="kind"
            label={t.fields.kind}
            required
            items={t.kinds}
            defaultValue={value("kind", session?.kind ?? "recording")}
            onValueChange={(next) => isSessionKind(next) && setKind(next)}
            error={error("kind")}
          />
          <OptionSelect
            name="status"
            label={t.fields2.status}
            items={t.statuses}
            defaultValue={value("status", session?.status ?? "done")}
            error={error("status")}
          />
          <Field
            name="date"
            type="date"
            label={t.fields.date}
            defaultValue={value("date", session?.date)}
            error={error("date")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              name="startsAt"
              type="time"
              label={t.fields2.startsAt}
              defaultValue={value("startsAt", session?.startsAt)}
              error={error("startsAt")}
            />
            <Field
              name="endsAt"
              type="time"
              label={t.fields2.endsAt}
              defaultValue={value("endsAt", session?.endsAt)}
              error={error("endsAt")}
            />
          </div>
          <Field
            name="studio"
            label={t.fields.studio}
            autoComplete="off"
            maxLength={200}
            defaultValue={value("studio", session?.studio)}
            error={error("studio")}
          />
          <SessionEngineerField
            masterId={masterId}
            kind={kind}
            defaultName={value("engineer", session?.engineer)}
            defaultRef={
              value("engineerRef", session?.engineerContactId) || null
            }
            error={error("engineer")}
          />
          <TextareaField
            name="notes"
            label={t.fields.notes}
            rows={3}
            maxLength={2000}
            defaultValue={value("notes", session?.notes)}
            error={error("notes")}
          />
        </>
      )}
    </MasterForm>
  );
}
