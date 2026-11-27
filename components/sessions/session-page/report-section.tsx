"use client";

import { SessionReportButton } from "@/components/sessions/session-page/report-button";
import { PageSection } from "@/components/shell/page-section";
import { Timestamp } from "@/components/ui/timestamp";
import { sessions } from "@/lib/i18n/fr/sessions";
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
    canEdit && <SessionReportButton session={session} primary={primary} />;

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
