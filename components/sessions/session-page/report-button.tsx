"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { AttendeeChips } from "@/components/calls/prep/attendee-chips";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { sessions } from "@/lib/i18n/fr/sessions";
import { saveSessionReport } from "@/lib/sessions/actions";
import {
  loadSessionFormData,
  type SessionFormData,
} from "@/lib/sessions/form-data";
import type { StudioSession } from "@/lib/sessions/types";

const fr = { sessions };

/**
 * « Rédiger le compte rendu » / « Modifier le compte rendu »: the report's
 * form in the modal, the same on the session's page and in its side sheet.
 * `primary`: the reader's gesture (its responsible, the séance over).
 */
export function SessionReportButton({
  session,
  primary = false,
}: {
  session: StudioSession;
  primary?: boolean;
}) {
  const t = fr.sessions.report;
  const label = session.reportNotes ? t.edit : t.write;
  return (
    <LoadedFormButton
      label={label}
      icon={IconPenWriting2}
      size={primary ? "lg" : "sm"}
      variant={primary ? "default" : "outline"}
      title={label}
      description={t.description}
      closeLabel={fr.sessions.page.close}
      load={loadSessionFormData}
    >
      {(data, close) => (
        <ReportForm data={data} session={session} onDone={close} />
      )}
    </LoadedFormButton>
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
