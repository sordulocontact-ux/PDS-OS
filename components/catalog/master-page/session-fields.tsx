"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import {
  SESSION_KINDS,
  type MasterSession,
  type SessionKind,
} from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";

import { SessionEngineerField } from "./session-engineer-field";

const fr = { masterPage };

const isSessionKind = (value: string | undefined): value is SessionKind =>
  (SESSION_KINDS as readonly string[]).includes(value ?? "");

type Saved = Pick<
  MasterSession,
  | "kind"
  | "date"
  | "startsAt"
  | "endsAt"
  | "studio"
  | "engineer"
  | "engineerContactId"
  | "notes"
>;

type FormReaders = {
  value: (name: string, saved: string | number | null | undefined) => string;
  error: (name: string) => string | undefined;
};

/** The session's kind, followed by the engineer proposed for it. */
export function useSessionKind(
  session: Pick<Saved, "kind"> | null,
  defaultKind?: string,
) {
  return useState<SessionKind>(
    isSessionKind(defaultKind) ? defaultKind : (session?.kind ?? "recording"),
  );
}

/**
 * « La séance »: its kind, date, hours and place. Never its state: it is
 * computed from these and from its report (lib/sessions/state.ts, Ibé,
 * 06/11/2026).
 */
export function SessionWhenFields({
  session,
  onKind,
  value,
  error,
}: FormReaders & {
  session: Saved | null;
  onKind: (kind: SessionKind) => void;
}) {
  const t = fr.masterPage.sessions;
  return (
    <>
      <OptionSelect
        name="kind"
        label={t.fields.kind}
        required
        items={t.kinds}
        defaultValue={value("kind", session?.kind ?? "recording")}
        onValueChange={(next) => isSessionKind(next) && onKind(next)}
        error={error("kind")}
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
    </>
  );
}

/** The session's notes; `label`: « Notes de préparation » in Sessions studio. */
export function SessionNotesField({
  session,
  label,
  placeholder,
  value,
  error,
}: FormReaders & {
  session: Pick<Saved, "notes"> | null;
  label?: string;
  placeholder?: string;
}) {
  return (
    <TextareaField
      name="notes"
      label={label ?? fr.masterPage.sessions.fields.notes}
      rows={3}
      maxLength={2000}
      placeholder={placeholder}
      defaultValue={value("notes", session?.notes)}
      error={error("notes")}
    />
  );
}

/**
 * Every field of a session in one column, for the title's form
 * (SessionForm); the Sessions studio form spreads the same pieces over its
 * three parts. `masterId` null: the engineers proposed come from the Réseau
 * only.
 */
export function SessionFields({
  masterId,
  session,
  defaultKind,
  value,
  error,
}: FormReaders & {
  masterId: string | null;
  session: Saved | null;
  // The kind proposed by PO, over the saved one.
  defaultKind?: string;
}) {
  const [kind, setKind] = useSessionKind(session, defaultKind);
  return (
    <>
      <SessionWhenFields
        session={session}
        onKind={setKind}
        value={value}
        error={error}
      />
      <SessionEngineerField
        masterId={masterId}
        kind={kind}
        defaultName={value("engineer", session?.engineer)}
        defaultRef={value("engineerRef", session?.engineerContactId) || null}
        error={error("engineer")}
      />
      <SessionNotesField session={session} value={value} error={error} />
    </>
  );
}
