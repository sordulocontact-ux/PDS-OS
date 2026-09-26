import { MetaList } from "@/components/labo/meta-list";
import { ReportPanel } from "@/components/labo/report-panel";
import { TranscriptPanel } from "@/components/labo/transcript-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/calls/format";
import type { StoredReport, StoredTranscript } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { formatMs, formatTimestamp } from "@/lib/labo/format";

/** Transcript and latest report of a call, as stored. */
export function CallResults({
  transcript,
  report,
}: {
  transcript: StoredTranscript | null;
  report: StoredReport | null;
}) {
  const t = fr.calls;
  const seconds = transcript?.transcript.durationSeconds;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.transcript.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {transcript ? (
            <>
              <TranscriptPanel transcript={transcript.transcript} />
              <MetaList
                items={[
                  [t.meta.model, transcript.model],
                  ...(transcript.processingMs !== null
                    ? [
                        [
                          t.meta.duration,
                          formatMs(transcript.processingMs),
                        ] as [string, string],
                      ]
                    : []),
                  ...(seconds !== undefined
                    ? [
                        [t.meta.audioLength, formatTimestamp(seconds)] as [
                          string,
                          string,
                        ],
                      ]
                    : []),
                ]}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.transcript.empty}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.report.title}</CardTitle>
          {report && (
            <CardDescription>
              {t.report.generatedAt(formatDateTime(report.createdAt))} ·{" "}
              {t.report.history(report.count)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-4">
          {report ? (
            <>
              <ReportPanel report={report.report} />
              <MetaList
                items={[
                  [t.meta.model, report.model],
                  ...(report.processingMs !== null
                    ? [
                        [t.meta.duration, formatMs(report.processingMs)] as [
                          string,
                          string,
                        ],
                      ]
                    : []),
                  [
                    t.meta.tokens,
                    `${report.inputTokens ?? "?"} / ${report.outputTokens ?? "?"}`,
                  ],
                ]}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t.report.empty}</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
