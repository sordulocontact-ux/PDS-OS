import { MeetingLineRow } from "@/components/calls/meeting/meeting-line";
import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { TranscriptPanel } from "@/components/labo/transcript-panel";
import type { MeetingData } from "@/lib/calls/meeting/types";
import type { StoredTranscript } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * « Compte rendu » of a call (proto `docs/protos/pages.html`): each line PO
 * filed — its nature, the sentence quoted as said, its state (« Confirmé
 * par » whoever closed the call, else « À confirmer »).
 */
export function CallReportCard({ meeting }: { meeting: MeetingData }) {
  const t = fr.calls.page.report;
  return (
    <PageSection
      id="call-report"
      title={t.title}
      description={t.description}
      card
    >
      {meeting.lines.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ul className="flex flex-col">
          {meeting.lines.map((line) => (
            <MeetingLineRow key={line.id} line={line} />
          ))}
        </ul>
      )}
    </PageSection>
  );
}

/** The transcript, folded (proto: « Extraits minutés »). A native fold:
 * a link to one of its passages (#t-…, « Voir le passage ») opens it. */
export function CallTranscriptCard({
  transcript,
}: {
  transcript: StoredTranscript;
}) {
  const t = fr.calls.page.transcript;
  const segments = transcript.transcript.segments.length;
  return (
    <PageSection id="transcript" title={t.title} card>
      <details className="group">
        <summary className="w-fit cursor-pointer rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          {t.fold(segments)}
        </summary>
        <div className="pt-3">
          <TranscriptPanel transcript={transcript.transcript} />
        </div>
      </details>
    </PageSection>
  );
}
