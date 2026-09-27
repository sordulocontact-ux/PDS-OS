import Link from "next/link";
import { notFound } from "next/navigation";
import { IconChevronLeft } from "nucleo-sharp-essential";

import { CallAgenda } from "@/components/calls/call-agenda";
import { CallStatusBadge } from "@/components/calls/call-badges";
import { CallAudio, CallRecording } from "@/components/calls/call-recording";
import { CallResults } from "@/components/calls/call-results";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime, isUpcoming } from "@/lib/calls/format";
import {
  getAudioUrl,
  getCall,
  loadLatestReport,
  loadLatestTranscript,
} from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `${fr.calls.list.title} · ${fr.app.name}` };

/**
 * One call, one step at a time: record it, let the processing run by itself,
 * then its report is in the Brief (the processing lands on the framing).
 */
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
  const step = !call.audioPath ? "record" : report ? "done" : "processing";

  return (
    <div className="grid w-full max-w-3xl gap-6">
      <header className="grid gap-3">
        <Link
          href={routes.projectCalls(projectId)}
          className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <IconChevronLeft aria-hidden className="size-4" />
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
          <CallStatusBadge
            status={call.status}
            upcoming={isUpcoming(call, new Date())}
          />
        </div>
      </header>

      {step === "record" && call.agenda && (
        <CallAgenda
          agenda={call.agenda}
          durationMinutes={call.durationMinutes}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.page[step].title}</CardTitle>
          <CardDescription>{t.page[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "done" ? (
            <div className="grid gap-6">
              <Link
                href={routes.projectFraming(projectId)}
                className={buttonVariants({
                  size: "lg",
                  className: "justify-self-start",
                })}
              >
                {t.page.done.toFraming}
              </Link>
              <CallAudio call={call} audioUrl={audioUrl} />
            </div>
          ) : (
            <CallRecording
              call={call}
              audioUrl={audioUrl}
              hasTranscript={transcript !== null}
            />
          )}
        </CardContent>
      </Card>

      {step === "done" && (
        <CallResults transcript={transcript} report={report} />
      )}
    </div>
  );
}
