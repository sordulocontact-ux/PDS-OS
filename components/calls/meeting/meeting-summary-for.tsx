import { IconEnvelopeOpen } from "nucleo-sharp-essential";

import { DocumentCard } from "@/components/ui/document-card";
import { routes } from "@/lib/auth/redirects";
import type { SummaryVersion } from "@/lib/calls/meeting/types";
import { shortStamp } from "@/lib/calls/prep/dates";
import { meeting } from "@/lib/i18n/fr/meeting";

import { SummaryPdfButton } from "./summary-pdf-button";

const fr = { meeting };

/**
 * What a participant reads of a meeting (proto `summaryFor`): the last
 * version of the summary sent to them, as the card of a document — who
 * sent it and when on its line, « Voir le PDF » when they are in the app
 * (`callId`; a private link has no session for it), the message below.
 */
export function MeetingSummaryFor({
  summary,
  callId,
}: {
  summary: SummaryVersion | null;
  callId?: string;
}) {
  if (!summary) return null;
  const t = fr.meeting.summaryFor;
  return (
    <DocumentCard
      name={t.heading}
      line={t.sentBy(
        summary.sentBy ?? "—",
        shortStamp(summary.sentAt),
        summary.version,
      )}
      icon={IconEnvelopeOpen}
      action={
        callId ? (
          <SummaryPdfButton
            href={routes.callSummaryPdf(callId, summary.version)}
          />
        ) : null
      }
    >
      <p className="px-3.5 py-3 text-body-md leading-[1.55] whitespace-pre-line">
        {summary.text}
      </p>
    </DocumentCard>
  );
}
