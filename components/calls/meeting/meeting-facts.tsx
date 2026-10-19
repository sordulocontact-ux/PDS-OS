import { CallFacts } from "@/components/calls/call-facts";
import type { MeetingData } from "@/lib/calls/meeting/types";
import { callWhen } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";

import { MeetingReportDialog } from "./meeting-report-dialog";

/**
 * A meeting held, in its step: « Échange stratégique · Lun. 05/10/2026 à
 * 14:00 · Visio · participants », then « Lire le compte rendu » once the
 * report is there.
 */
export function MeetingFacts({ meeting }: { meeting: MeetingData }) {
  const t = fr.meeting;
  return (
    <CallFacts
      facts={[
        {
          label: meeting.name,
          value: t.facts(
            callWhen(meeting.occurredAt),
            meeting.format ? fr.callPrep.formats[meeting.format] : null,
            meeting.participants.map((p) => p.name).join(", "),
          ),
        },
        {
          label: t.report,
          value: meeting.reportReady ? (
            <MeetingReportDialog meeting={meeting} />
          ) : (
            <span className="text-caption text-[color:var(--text-tertiary)]">
              {t.noReport}
            </span>
          ),
        },
      ]}
    />
  );
}
