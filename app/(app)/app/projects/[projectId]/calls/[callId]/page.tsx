import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { CallStatusBadge, ConsentBadge } from "@/components/calls/call-badges";
import { CallRecording } from "@/components/calls/call-recording";
import { CallResults } from "@/components/calls/call-results";
import { ConsentForm } from "@/components/calls/consent-block";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime } from "@/lib/calls/format";
import {
  getAudioUrl,
  getCall,
  loadLatestReport,
  loadLatestTranscript,
} from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `${fr.calls.list.title} · ${fr.app.name}` };

export default async function CallPage({
  params,
}: PageProps<"/app/projects/[projectId]/calls/[callId]">) {
  await requireApproved();
  const { projectId, callId } = await params;
  await requireLaunchedProject(projectId);
  const supabase = await createClient();

  const call = await getCall(supabase, projectId, callId);
  if (!call) notFound();
  const [transcript, report, audioUrl] = await Promise.all([
    loadLatestTranscript(supabase, callId),
    loadLatestReport(supabase, callId),
    call.audioPath ? getAudioUrl(supabase, call.audioPath) : null,
  ]);
  const t = fr.calls;

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <Link
          href={routes.projectCalls(projectId)}
          className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ChevronLeftIcon aria-hidden className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold break-words">{call.title}</h2>
            <time
              dateTime={call.occurredAt}
              className="text-sm text-muted-foreground"
            >
              {formatDateTime(call.occurredAt)}
            </time>
          </div>
          <div className="flex gap-2">
            <ConsentBadge consent={call.consent} />
            <CallStatusBadge status={call.status} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.consent.title}</CardTitle>
            <CardDescription>
              {call.consentRecordedAt
                ? t.consent.recorded(
                    formatDateTime(call.consentRecordedAt),
                    call.consentRecordedBy,
                  )
                : t.consent.notRecorded}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConsentForm
              callId={call.id}
              consent={call.consent}
              note={call.consentNote}
              locked={call.audioPath !== null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.audio.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CallRecording
              call={call}
              audioUrl={audioUrl}
              hasTranscript={transcript !== null}
              hasReport={report !== null}
            />
          </CardContent>
        </Card>
      </div>

      <CallResults transcript={transcript} report={report} />
    </div>
  );
}
