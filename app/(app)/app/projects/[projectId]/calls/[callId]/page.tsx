import Link from "next/link";
import { notFound } from "next/navigation";

import { CallOutcomes } from "@/components/calls/call-outcomes";
import { CallWorkspace } from "@/components/calls/call-workspace";
import { buttonVariants } from "@/components/ui/button";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadCallOutcomes } from "@/lib/calls/outcomes";
import {
  getAudioUrl,
  getCall,
  loadLatestReport,
  loadLatestTranscript,
} from "@/lib/calls/queries";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `${fr.calls.list.title} · ${fr.app.name}` };

/**
 * One call of a project: record it, let the processing run by itself, then
 * its report is in the Brief (the processing lands on the framing; an
 * exchange of the Stratégie fills the Stratégie instead), and its
 * actions become the project's tasks.
 */
export default async function CallPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/calls/[callId]">) {
  const access = await requireApproved();
  const { projectId, callId } = await params;
  const { meet } = await searchParams;
  const project = await requireLaunchedProject(projectId);
  const supabase = await createClient();

  const call = await getCall(supabase, projectId, callId);
  if (!call) notFound();
  const [transcript, report, audioUrl] = await Promise.all([
    loadLatestTranscript(supabase, callId),
    loadLatestReport(supabase, callId),
    call.audioPath ? getAudioUrl(supabase, call.audioPath) : null,
  ]);
  const canEdit = canEditProject(access, project);
  const [outcomes, members] = report
    ? await Promise.all([
        loadCallOutcomes(supabase, report),
        canEdit ? loadMembers(access) : [],
      ])
    : [null, []];
  const t = fr.calls;

  return (
    <CallWorkspace
      call={call}
      transcript={transcript}
      report={report}
      audioUrl={audioUrl}
      canEdit={canEdit}
      back={{ href: routes.projectCalls(projectId), label: t.back }}
      where={
        <Link
          href={routes.project(projectId)}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {project.title}
        </Link>
      }
      organizer={project.ownerName ?? null}
      steps={t.page}
      meetFailed={meet === "failed"}
      doneAction={
        <Link
          href={
            call.prepared?.kind === "strategy"
              ? routes.projectStrategy(projectId)
              : routes.projectFraming(projectId)
          }
          className={buttonVariants({
            size: "lg",
            className: "justify-self-start",
          })}
        >
          {call.prepared?.kind === "strategy"
            ? fr.strategyEntry.toStrategy
            : t.page.done.toFraming}
        </Link>
      }
      outcomes={
        outcomes && (
          <CallOutcomes
            outcomes={outcomes}
            members={members}
            projectId={projectId}
            projects={canEdit ? [{ id: project.id, title: project.title }] : []}
          />
        )
      }
    />
  );
}
