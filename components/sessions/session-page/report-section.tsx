"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { AttendeeChips } from "@/components/calls/prep/attendee-chips";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { PageSection } from "@/components/shell/page-section";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { Timestamp } from "@/components/ui/timestamp";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { sessions } from "@/lib/i18n/fr/sessions";
import { saveSessionReport } from "@/lib/sessions/actions";
import {
  loadSessionFormData,
  type SessionFormData,
} from "@/lib/sessions/form-data";
import type { StudioSession } from "@/lib/sessions/types";

const fr = { sessions };
const muted = "text-sm text-[color:var(--text-secondary)]";
const label = "text-sm font-medium text-[color:var(--text-secondary)]";

/** One part of a written report, under its small heading. */
function Part({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={label}>{title}</span>
      <p className="break-words whitespace-pre-line">{text}</p>
    </div>
  );
}

/**
 * « Compte rendu » (Ibé, 01 and 06/11/2026): a free summary, then two short
 * marks, « À retenir » and « Prochaine étape », and who was there (the
 * maquettes made are the section below). It opens once the séance starts;
 * its responsible (the project manager, else whoever created it) writes it,
 * their gesture first (docs/VISION-UX.md § 4). Written, the session is
 * Terminée and this is the sheet everyone reads.
 */
export function ReportSection({
  session,
  viewerPersonId,
  canEdit,
}: {
  session: StudioSession;
  viewerPersonId: string | null;
  canEdit: boolean;
}) {
  const t = fr.sessions.report;
  const mine = session.responsible?.personId === viewerPersonId;
  const done = session.state === "done";
  const write = (primary: boolean) =>
    canEdit && (
      <LoadedFormButton
        label={session.reportNotes ? t.edit : t.write}
        icon={IconPenWriting2}
        size={primary ? "lg" : "sm"}
        variant={primary ? "default" : "outline"}
        title={session.reportNotes ? t.edit : t.write}
        description={t.description}
        closeLabel={fr.sessions.page.close}
        load={loadSessionFormData}
      >
        {(data, close) => (
          <ReportForm data={data} session={session} onDone={close} />
        )}
      </LoadedFormButton>
    );

  return (
    <PageSection
      card
      id="compte-rendu"
      title={t.title}
      description={t.description}
      action={done ? write(false) : null}
    >
      {done ? (
        <div className="flex flex-col gap-5">
          <p className="break-words whitespace-pre-line">
            {session.reportNotes}
          </p>
          {(session.reportTakeaways || session.reportNextStep) && (
            <div className="grid gap-5 sm:grid-cols-2">
              {session.reportTakeaways && (
                <Part title={t.takeaways} text={session.reportTakeaways} />
              )}
              {session.reportNextStep && (
                <Part title={t.nextStep} text={session.reportNextStep} />
              )}
            </div>
          )}
          <Part
            title={t.present}
            text={session.attendees.map((a) => a.name).join(", ") || t.nobody}
          />
          {session.reportedBy && session.reportedAt && (
            <p className={muted}>
              {t.signed(session.reportedBy)} ·{" "}
              <Timestamp iso={session.reportedAt} />
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          {mine ? (
            <>
              <p>{session.state === "ongoing" ? t.ongoing : t.why}</p>
              {write(true)}
            </>
          ) : (
            <>
              <p className={muted}>
                {session.responsible
                  ? t.waitingFor(session.responsible.name)
                  : t.why}
              </p>
              {write(false)}
            </>
          )}
        </div>
      )}
    </PageSection>
  );
}

function ReportForm({
  data,
  session,
  onDone,
}: {
  data: SessionFormData;
  session: StudioSession;
  onDone: () => void;
}) {
  const t = fr.sessions.report;
  // Pre-filled with the session's participants: the report confirms them.
  const [people, setPeople] = useState<PrepPerson[]>(() => {
    const keys = session.attendees.map((a) => a.key);
    return data.people.filter((p) => keys.includes(p.key));
  });
  return (
    <MasterForm
      action={saveSessionReport}
      hidden={{ sessionId: session.id }}
      onDone={onDone}
    >
      {({ value, error }) => (
        <>
          <TextareaField
            name="reportNotes"
            label={t.notes}
            required
            rows={6}
            maxLength={5000}
            placeholder={t.notesPlaceholder}
            defaultValue={value("reportNotes", session.reportNotes)}
            error={error("reportNotes")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextareaField
              name="reportTakeaways"
              label={t.takeaways}
              rows={3}
              maxLength={2000}
              placeholder={t.takeawaysPlaceholder}
              defaultValue={value("reportTakeaways", session.reportTakeaways)}
              error={error("reportTakeaways")}
            />
            <TextareaField
              name="reportNextStep"
              label={t.nextStep}
              rows={3}
              maxLength={2000}
              placeholder={t.nextStepPlaceholder}
              defaultValue={value("reportNextStep", session.reportNextStep)}
              error={error("reportNextStep")}
            />
          </div>
          <AttendeeChips
            id="report-attendees"
            pool={data.people}
            value={people}
            onChange={setPeople}
            hint={t.presentHint}
            hiddenNames
            invitesAll={false}
          />
        </>
      )}
    </MasterForm>
  );
}
