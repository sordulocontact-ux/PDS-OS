import { DocumentCard } from "@/components/ui/document-card";
import type { MeetingData } from "@/lib/calls/meeting/types";
import { callWhen } from "@/lib/calls/prep/dates";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { meeting } from "@/lib/i18n/fr/meeting";

import { MeetingReportDialog } from "./meeting-report-dialog";

const fr = { callPrep, meeting };

/**
 * A meeting held, in its step: its report as a document (DocumentCard,
 * the card of every document in a step, Sacha 05/11/2026) — « Compte rendu
 * · Échange de cadrage », when, format and who on its line, « Lire le
 * compte rendu » on the right once the report is there.
 */
export function MeetingFacts({ meeting }: { meeting: MeetingData }) {
  const t = fr.meeting;
  return (
    <DocumentCard
      name={t.reportName(meeting.name)}
      line={t.facts(
        callWhen(meeting.occurredAt),
        meeting.format ? fr.callPrep.formats[meeting.format] : null,
        meeting.participants.map((p) => p.name).join(", "),
      )}
      action={
        meeting.reportReady ? <MeetingReportDialog meeting={meeting} /> : null
      }
    >
      {!meeting.reportReady && (
        <p className="px-3.5 py-3 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.noReport}
        </p>
      )}
    </DocumentCard>
  );
}
