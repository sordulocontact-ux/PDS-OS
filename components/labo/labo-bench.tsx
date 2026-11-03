"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@/components/ui/toast";

import { CallPrepPanel } from "@/components/labo/call-prep-panel";
import { MetaList } from "@/components/labo/meta-list";
import { ReportPanel } from "@/components/labo/report-panel";
import { SourceForms } from "@/components/labo/source-forms";
import { TranscriptPanel } from "@/components/labo/transcript-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import type { Transcription } from "@/lib/ai/transcribe";
import { labo } from "@/lib/i18n/fr/labo";
import {
  requestReport,
  requestTranscription,
  type LaboResult,
  type ReportResult,
} from "@/lib/labo/client";
import { formatMs, formatTimestamp } from "@/lib/labo/format";

const fr = { labo };

type Source = {
  transcript: Transcript;
  meta?: Omit<Transcription, "transcript">;
};

export function LaboBench() {
  const t = fr.labo;
  const [source, setSource] = useState<Source | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [busy, setBusy] = useState<"transcribe" | "extract" | null>(null);

  function failed<T>(
    result: LaboResult<T>,
  ): result is Extract<LaboResult<T>, { ok: false }> {
    if (!result.ok) toast.error(t.errors[result.error]);
    return !result.ok;
  }

  async function onTranscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("audio");
    if (!(file instanceof File) || file.size === 0)
      return void toast.error(t.errors.no_file);
    setBusy("transcribe");
    const result = await requestTranscription(file);
    setBusy(null);
    if (failed(result)) return;
    const { transcript, ...meta } = result.data;
    setSource({ transcript, meta });
    setReport(null);
  }

  function onPaste(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(
      new FormData(event.currentTarget).get("text") ?? "",
    ).trim();
    if (!text) return void toast.error(t.errors.invalid_input);
    setSource({ transcript: { text, segments: [] } });
    setReport(null);
  }

  async function onExtract() {
    if (!source) return;
    setBusy("extract");
    const result = await requestReport(source.transcript);
    setBusy(null);
    if (!failed(result)) setReport(result.data);
  }

  return (
    <div className="grid gap-6">
      <SourceForms
        busy={busy !== null}
        transcribing={busy === "transcribe"}
        onTranscribe={onTranscribe}
        onPaste={onPaste}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.transcript.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {source ? (
            <>
              {source.meta && (
                <MetaList
                  items={[
                    [
                      t.meta.model,
                      `${source.meta.provider} · ${source.meta.model}`,
                    ],
                    [t.meta.duration, formatMs(source.meta.durationMs)],
                    ...(source.transcript.durationSeconds !== undefined
                      ? [
                          [
                            t.meta.audioLength,
                            formatTimestamp(source.transcript.durationSeconds),
                          ] as [string, string],
                        ]
                      : []),
                  ]}
                />
              )}
              <TranscriptPanel transcript={source.transcript} />
              <Button
                onClick={onExtract}
                disabled={busy !== null}
                className="justify-self-start"
              >
                {busy === "extract"
                  ? t.transcript.pending
                  : t.transcript.extract}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.transcript.empty}
            </p>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>{t.report.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <MetaList
              items={[
                [t.meta.model, `${report.provider} · ${report.model}`],
                [t.meta.duration, formatMs(report.durationMs)],
                [
                  t.meta.tokens,
                  `${report.inputTokens ?? "?"} / ${report.outputTokens ?? "?"}`,
                ],
              ]}
            />
            <ReportPanel report={report.output} />
            <CallPrepPanel report={report.output} />
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                {t.report.raw}
              </summary>
              <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3">
                {JSON.stringify(report.output, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
