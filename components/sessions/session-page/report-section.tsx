"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { AttendeeChips } from "@/components/calls/prep/attendee-chips";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { StatusBadge } from "@/components/ui/status-badge";
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

/**
 * « Compte rendu » (Ibé, 01/11/2026): who was there, the maquettes made (the
 * section below) and what to remember. Written after the session by its
 * responsible (the project manager, else whoever created it): for them, the
 * gesture comes first (« À vous »), as in every step (docs/VISION-UX.md § 4).
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
      action={session.report === "done" ? write(false) : null}
    >
      {session.report === "done" ? (
        <div className="flex flex-col gap-4">
          <p className="break-words whitespace-pre-line">
            {session.reportNotes}
          </p>
          <div className="flex flex-col gap-1">
            <span className={muted}>{t.present}</span>
            <span>
              {session.attendees.map((a) => a.name).join(", ") || t.nobody}
            </span>
          </div>
          {session.reportedBy && session.reportedAt && (
            <p className={muted}>
              {t.signed(session.reportedBy)} ·{" "}
              <Timestamp iso={session.reportedAt} />
            </p>
          )}
        </div>
      ) : session.report === "todo" ? (
        <div className="flex flex-col items-start gap-3">
          {mine ? (
            <>
              <StatusBadge tone="action">{t.lead}</StatusBadge>
              <p>{t.why}</p>
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
      ) : (
        <EmptyNote>
          {session.report === "cancelled" ? t.cancelled : t.notYet}
        </EmptyNote>
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
          <AttendeeChips
            id="report-attendees"
            pool={data.people}
            value={people}
            onChange={setPeople}
            hint={t.presentHint}
            hiddenNames
          />
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
        </>
      )}
    </MasterForm>
  );
}
